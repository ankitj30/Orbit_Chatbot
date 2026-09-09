import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authenticateUser = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                throw new Error('User not found');
            }
            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            const err = new Error('Not authorized, token failed');
            next(err);
        }
    }

    if (!token) {
        res.status(401);
        const err = new Error('Not authorized, no token provided');
        next(err);
    }
};

export { authenticateUser };
