import mongoose, { Schema } from 'mongoose';

const seatSchema = new Schema({
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    label: { type: String, required: true }, // e.g., A1
    type: { type: Number, required: true }, // 1=Standard, 2=VIP
    price: { type: Number, required: true },
    status: { type: String, enum: ['available', 'booked'], default: 'available' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
});

const showtimeSchema = new Schema({
    tmdbId: { type: Number, required: true },
    hall: { type: Schema.Types.ObjectId, ref: 'Hall', required: true },
    startTime: { type: Date, required: true },
    seats: [seatSchema],
}, { timestamps: true });

export const Showtime = mongoose.models.Showtime || mongoose.model('Showtime', showtimeSchema);
