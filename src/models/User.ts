import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    watchlist: [{ type: Number }], // TMDB Movie IDs
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
