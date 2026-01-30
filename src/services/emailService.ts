import nodemailer from 'nodemailer';

// Configure the transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'gmail' or your preferred service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Helper to verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('Email Service Error:', error);
    } else {
        console.log('Email Service is ready to send messages');
    }
});

/**
 * Sends a security alert email when a new login is detected.
 */
export const sendLoginAlert = async (userEmail: string, userName: string) => {
    try {
        const mailOptions = {
            from: `"CineBook Security" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'New Login Detected | CineBook',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">New Login Detected</h2>
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>We detected a new login to your CineBook account.</p>
                    <p style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; text-align: center;">
                        <strong>Date:</strong> ${new Date().toLocaleString()}
                    </p>
                    <p>If this was you, you can safely ignore this email.</p>
                    <p>If you did not authorize this login, please contact support immediately.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">&copy; ${new Date().getFullYear()} CineBook Inc.</p>
                </div>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            await transporter.sendMail(mailOptions);
            console.log(`Login alert sent to ${userEmail}`);
        } else {
            console.warn('Email credentials missing. Skipping email.');
        }

    } catch (error) {
        console.error('Failed to send login alert:', error);
        // Do not throw error to avoid crashing the auth flow
    }
};

interface OrderDetails {
    movieTitle: string;
    date: string;
    time: string;
    cinemaName: string;
    hallName: string;
    seats: string[];
    posterUrl?: string;
    totalPrice: number | string;
    bookingId: string;
}

/**
 * Sends a booking confirmation email with ticket details.
 */
export const sendBookingConfirmation = async (userEmail: string, order: OrderDetails) => {
    try {
        const mailOptions = {
            from: `"CineBook Tickets" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Your Ticket: ${order.movieTitle}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Ticket is Ready! 🎟️</h1>
                    </div>

                    <!-- Movie Info -->
                    <div style="padding: 24px; background-color: #f8fafc; text-align: center;">
                         <img src="${order.posterUrl}" alt="Movie Poster" style="width: 120px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 16px;">
                        <h2 style="margin: 0 0 8px 0; color: #0f172a;">${order.movieTitle}</h2>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">Booking ID: #${order.bookingId.slice(-6).toUpperCase()}</p>
                    </div>

                    <!-- Ticket Details Table -->
                    <div style="padding: 24px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Date</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${order.date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Time</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${order.time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Cinema</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${order.cinemaName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Hall</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${order.hallName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Seats</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right; color: #3b82f6;">${order.seats.join(', ')}</td>
                            </tr>
                             <tr>
                                <td style="padding: 12px 0; color: #64748b;">Total Paid</td>
                                <td style="padding: 12px 0; font-weight: bold; text-align: right; font-size: 18px;">$${order.totalPrice}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- QR Code Placeholder -->
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px dashed #e2e8f0;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Scan at the entrance</p>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.bookingId}" alt="QR Code" style="background: white; padding: 10px; border-radius: 8px;">
                    </div>

                    <!-- Footer -->
                    <div style="padding: 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                        <p>Trouble finding the cinema? <a href="#" style="color: #3b82f6;">View on Maps</a></p>
                        <p>&copy; ${new Date().getFullYear()} CineBook Inc.</p>
                    </div>
                </div>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            await transporter.sendMail(mailOptions);
            console.log(`Booking confirmation sent to ${userEmail}`);
        } else {
            console.warn('Email credentials missing. Skipping email.');
        }

    } catch (error) {
        console.error('Failed to send booking confirmation:', error);
    }
};

/**
 * Sends an OTP email for password reset.
 */
export const sendOtpEmail = async (userEmail: string, otp: string) => {
    try {
        const mailOptions = {
            from: `"CineBook Security" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Password Reset OTP | CineBook',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">Reset Your Password</h2>
                    <p>You requested a password reset. Use the OTP below to proceed:</p>
                    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #0f172a; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code expires in 10 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${userEmail}`);
        } else {
            console.warn('Email credentials missing. Skipping email.');
            console.log(`[DEV MODE] OTP for ${userEmail}: ${otp}`);
        }

    } catch (error) {
        console.error('Failed to send OTP:', error);
    }
};
