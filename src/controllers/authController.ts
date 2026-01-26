import axios from 'axios';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { sendLoginAlert } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;
        console.log('[DEBUG] Registration flow started for:', email);

        if (!req.body) {
            console.error('[DEBUG] Request body is missing');
            return res.status(400).json({ message: 'Request body is missing' });
        }

        const existingUser = await User.findOne({ email });
        console.log('[DEBUG] Existing user check finished:', existingUser ? 'Found' : 'Not found');

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        console.log('[DEBUG] Starting password hashing...');
        const hashedPassword = await bcrypt.hash(password, 12);
        console.log('[DEBUG] Password hashed successfully');

        const user = new User({ name, email, password: hashedPassword });
        console.log('[DEBUG] Saving user to DB...');
        await user.save();
        console.log('[DEBUG] User saved with ID:', user._id);

        console.log('[DEBUG] Signing JWT token...');
        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
        console.log('[DEBUG] Token signed successfully');

        res.status(201).json({ token, user: { id: user._id, name, email, profileImage: user.profileImage } });
    } catch (error: any) {
        console.error('!!! SERVER REGISTRATION ERROR !!!');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        // Trigger Login Alert Email (Non-blocking)
        sendLoginAlert(user.email, user.name);

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage } });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        console.log('[DEBUG] Google Login initiated');

        // Verify Google Token
        const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        const { email, name, sub: googleId, picture } = googleRes.data;

        if (!email) {
            return res.status(400).json({ message: 'Invalid Google Token' });
        }

        console.log('[DEBUG] Google Token verified for:', email);

        let user = await User.findOne({ email });

        if (!user) {
            console.log('[DEBUG] Creating new user from Google login');
            // Create new user if doesn't exist
            // Note: Password is required by schema usually, so we set a dummy one or handle it in schema
            // Assuming schema allows optional password or we set a random one
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 12);

            user = new User({
                name,
                email,
                password: hashedPassword,
                profileImage: picture,
                // googleId: googleId // Uncomment if schema has this field
            });
            await user.save();
        }

        if (user && picture && user.profileImage !== picture) {
            user.profileImage = picture;
            await user.save();
        }

        const jwtToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        // Trigger Login Alert Email (Non-blocking)
        sendLoginAlert(user.email, user.name);

        res.json({ token: jwtToken, user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage } });
    } catch (error: any) {
        console.error('Google Login Error:', error.message);
        res.status(500).json({ message: 'Google Login Failed', error: error.message });
    }
};

export const regenerateToken = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage } });
    } catch (error: any) {
        console.error('Regenerate Token Error:', error.message);
        res.status(500).json({ message: 'Failed to regenerate token' });
    }
};
