import mongoose, { Schema } from 'mongoose';

const hallSchema = new Schema({
    name: { type: String, required: true },
    rows: { type: Number, required: true },
    cols: { type: Number, required: true },
    layout: { type: [[Number]], required: true }, // 2D Matrix: 0=Aisle, 1=Standard, 2=VIP
}, { timestamps: true });

export const Hall = mongoose.models.Hall || mongoose.model('Hall', hallSchema);
