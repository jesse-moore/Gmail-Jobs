import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { jwtVerify, SignJWT } from 'jose';

const secretKey = process.env.JWT_SECRET_KEY;

export class AuthService {
  //   static generateSecretKey = async () => {
  //     const secretKey = crypto.randomBytes(32).toString('hex');
  //     console.log(`Your secret key: ${secretKey}`);
  //   };

  static generateToken = async (userId: string): Promise<string> => {
    const secret = new TextEncoder().encode(secretKey);

    const token = await new SignJWT({ userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().sign(secret);

    return token;
  };

  static verifyToken = async (bearerToken: string): Promise<string> => {
    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
      throw new Error('Authorization token is missing or invalid');
    }

    const token = bearerToken.slice(7);
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId !== 'string') {
      throw new Error('Invalid token payload');
    }

    return payload.userId;
  };
}

export class HTTPProtectedTrigger {
  function: Function;
  constructor(fn: Function) {
    this.function = fn;
    return this;
  }

  httpTrigger = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    let userId: string = null;
    try {
      userId = await AuthService.verifyToken(authHeader);
    } catch (error) {
      return {
        status: 401,
        body: error.message || 'Authorization token is missing or invalid',
      };
    }
    return this.function(request, context, userId);
  };
}
