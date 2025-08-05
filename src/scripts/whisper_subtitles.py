#!/usr/bin/env python3
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from multiprocessing import cpu_count
import torch
from tqdm import tqdm

def check_dependencies():
    """检查必要的依赖"""
    missing = []
    try:
        import whisper
    except ImportError:
        missing.append("openai-whisper")
    
    try:
        import torch
    except ImportError:
        missing.append("torch")
    
    try:
        from tqdm import tqdm
    except ImportError:
        missing.append("tqdm")
    
    if missing:
        print(f"错误: 缺少以下依赖: {', '.join(missing)}")
        print(f"请运行: pip3 install {' '.join(missing)}")
        sys.exit(1)
    
    return True

def get_optimal_workers():
    """根据系统配置确定最优进程数"""
    # M3 Max 有 16 个性能核心
    # 对于 Whisper，每个进程占用较多内存，建议使用 CPU 核心数的一半
    cpu_cores = cpu_count()
    return min(max(cpu_cores // 2, 1), 8)  # 最多 8 个进程

def check_gpu_available():
    """检查是否有可用的 GPU"""
    # 暂时禁用 MPS，因为存在兼容性问题
    # 如果需要使用 GPU，请设置环境变量 PYTORCH_ENABLE_MPS_FALLBACK=1
    return "cpu"
    
    # 原始代码保留供参考
    # try:
    #     if torch.backends.mps.is_available():
    #         return "mps"  # Apple Silicon GPU
    #     elif torch.cuda.is_available():
    #         return "cuda"
    #     else:
    #         return "cpu"
    # except:
    #     return "cpu"

def load_model_cached(model_name="base", device=None):
    """加载并缓存模型"""
    import whisper
    
    if device is None:
        device = check_gpu_available()
    
    print(f"使用设备: {device}")
    
    # 尝试加载模型，兼容不同版本的 whisper
    try:
        # 新版本支持 fp16 参数
        fp16 = False if device == "mps" else True
        return whisper.load_model(model_name, device=device, fp16=fp16)
    except TypeError:
        # 旧版本不支持 fp16 参数
        return whisper.load_model(model_name, device=device)

def find_video_files(root_dir='.'):
    """递归查找所有视频文件"""
    videos_to_process = []
    supported_formats = ('.mp4', '.flv', '.avi', '.mkv', '.mov', '.wmv', '.webm')
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # 跳过隐藏目录
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]
        
        for filename in filenames:
            if filename.lower().endswith(supported_formats):
                file_path = os.path.join(dirpath, filename)
                base_name = os.path.splitext(filename)[0]
                
                # 检查同目录下是否已有字幕
                srt_exists = any(
                    os.path.exists(os.path.join(dirpath, f"{base_name}{suffix}"))
                    for suffix in ['_base.srt', '_small.srt', '.srt']
                )
                
                if not srt_exists:
                    # 存储相对路径，便于显示
                    rel_path = os.path.relpath(file_path, root_dir)
                    videos_to_process.append((file_path, rel_path))
    
    return videos_to_process

def generate_subtitle_worker(args):
    """工作进程：为单个视频生成字幕"""
    video_file, rel_path, model_name, device, worker_id = args
    import whisper
    
    # 字幕文件保存在视频同目录
    dir_path = os.path.dirname(video_file)
    base_name = os.path.splitext(os.path.basename(video_file))[0]
    srt_file = os.path.join(dir_path, f"{base_name}_base.srt")
    
    try:
        # 每个工作进程加载自己的模型实例
        model = load_model_cached(model_name, device)
        
        # 转录音频
        try:
            # 新版本 whisper 支持更多参数
            result = model.transcribe(
                video_file, 
                language="zh",
                verbose=False,
                fp16=False if device == "mps" else True,
                threads=2
            )
        except TypeError:
            # 旧版本 whisper 参数较少
            result = model.transcribe(
                video_file, 
                language="zh",
                verbose=False
            )
        
        # 生成 SRT 格式字幕
        with open(srt_file, "w", encoding="utf-8") as f:
            for i, segment in enumerate(result["segments"]):
                f.write(f"{i + 1}\n")
                f.write(f"{format_timestamp(segment['start'])} --> {format_timestamp(segment['end'])}\n")
                f.write(f"{segment['text'].strip()}\n\n")
        
        return rel_path, True, None
    except Exception as e:
        return rel_path, False, str(e)

def format_timestamp(seconds):
    """将秒数转换为 SRT 时间格式"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}".replace('.', ',')

def main():
    # 检查依赖
    check_dependencies()
    
    # 检查设备
    device = check_gpu_available()
    print(f"检测到设备: {device}")
    
    # 递归查找所有视频文件
    print("扫描视频文件...")
    videos_info = find_video_files('.')
    
    if not videos_info:
        print("所有视频都已有字幕！")
        return
    
    print(f"找到 {len(videos_info)} 个需要生成字幕的视频：")
    
    # 按目录分组显示
    dir_videos = {}
    for _, rel_path in videos_info:
        dir_name = os.path.dirname(rel_path) or "."
        if dir_name not in dir_videos:
            dir_videos[dir_name] = []
        dir_videos[dir_name].append(os.path.basename(rel_path))
    
    for dir_name, files in sorted(dir_videos.items()):
        print(f"  {dir_name}/")
        for file in files[:3]:  # 最多显示3个文件
            print(f"    - {file}")
        if len(files) > 3:
            print(f"    ... 还有 {len(files) - 3} 个文件")
    
    # 询问模型选择
    print("\n可用模型:")
    print("1. tiny   (39M, 最快, 准确度较低)")
    print("2. base   (74M, 平衡)")
    print("3. small  (244M, 较准确)")
    print("4. medium (769M, 准确)")
    print("5. large  (1550M, 最准确, 需要大量内存)")
    
    model_choice = input("选择模型 (1-5, 默认2): ").strip() or "2"
    model_map = {"1": "tiny", "2": "base", "3": "small", "4": "medium", "5": "large"}
    model_name = model_map.get(model_choice, "base")
    
    # 确定并行进程数
    num_workers = get_optimal_workers()
    print(f"\n将使用 {num_workers} 个并行进程")
    
    # 询问是否继续
    response = input("是否开始处理？(y/n): ")
    if response.lower() != 'y':
        print("已取消")
        return
    
    # 准备任务参数
    tasks = [(video_path, rel_path, model_name, device, i % num_workers) 
             for i, (video_path, rel_path) in enumerate(videos_info)]
    
    # 并行处理
    start_time = time.time()
    success_count = 0
    failed_videos = []
    
    print(f"\n开始并行处理...")
    
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        # 提交所有任务
        future_to_video = {executor.submit(generate_subtitle_worker, task): task[1] 
                          for task in tasks}
        
        # 使用 tqdm 显示进度条，设置更好的格式
        with tqdm(total=len(videos_info), 
                 desc="处理进度", 
                 unit="视频",
                 bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
                 colour="green") as pbar:
            for future in as_completed(future_to_video):
                rel_path = future_to_video[future]
                try:
                    path, success, error = future.result()
                    if success:
                        success_count += 1
                        # 更新进度条的后缀信息
                        pbar.set_postfix_str(f"成功: {success_count}, 失败: {len(failed_videos)}")
                        # 设置描述信息显示当前处理的文件
                        pbar.set_description(f"完成: {os.path.basename(path)}")
                    else:
                        failed_videos.append((path, error))
                        pbar.set_postfix_str(f"成功: {success_count}, 失败: {len(failed_videos)}")
                except Exception as e:
                    failed_videos.append((rel_path, str(e)))
                    pbar.set_postfix_str(f"成功: {success_count}, 失败: {len(failed_videos)}")
                
                pbar.update(1)
            
            # 完成后恢复描述
            pbar.set_description("处理完成")
    
    # 统计结果
    elapsed_time = time.time() - start_time
    print(f"\n处理完成！")
    print(f"成功: {success_count}/{len(videos_info)}")
    print(f"总用时: {elapsed_time:.1f} 秒")
    print(f"平均速度: {elapsed_time/len(videos_info):.1f} 秒/视频")
    
    if failed_videos:
        print("\n失败的视频:")
        for video, error in failed_videos:
            print(f"  - {video}: {error}")
    
    # 性能对比
    if len(videos_info) > 1:
        single_thread_estimate = elapsed_time * num_workers / len(videos_info) * len(videos_info)
        print(f"\n性能提升: 约 {single_thread_estimate/elapsed_time:.1f}x")

if __name__ == "__main__":
    main()