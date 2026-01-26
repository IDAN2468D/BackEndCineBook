import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        console.warn('[AUTH] No token provided in header:', authHeader);
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded.userId;
        next();
    } catch (err: any) {
        console.error('[AUTH] Token verification failed:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
