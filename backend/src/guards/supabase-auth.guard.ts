import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      console.error('SUPABASE_JWT_SECRET is not configured in backend .env');
      throw new UnauthorizedException('Auth configuration error');
    }

    try {
      // Verify the token using the Supabase JWT secret
      const decoded = jwt.verify(token, jwtSecret);
      // Attach the user info to the request for the controller to use if needed
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
