import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应格式统一拦截器
 * 将所有响应转换为 { success: true, result: data } 格式
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, { success: boolean; result: T }>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: boolean; result: T }> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        result: data,
      })),
    );
  }
}