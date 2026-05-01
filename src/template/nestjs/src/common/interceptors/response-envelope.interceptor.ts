import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应信封拦截器
 * 将所有响应转换为 { success: true, result: data } 格式
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  { success: boolean; result: T }
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ success: boolean; result: T }> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        result: data,
      })),
    );
  }
}
