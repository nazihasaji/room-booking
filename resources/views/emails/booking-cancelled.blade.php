<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your room booking has been cancelled</title>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9; color: #10203a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background: #f1f5f9;">
        <tr>
            <td align="center" style="padding: 56px 20px 40px;">
                <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 480px;">
                    <tr>
                        <td align="center" style="padding: 0 0 28px;">
                            <p style="margin: 0 0 10px; color: #d10a35; font-size: 12px; font-weight: 700; letter-spacing: 1.8px;">ROOM RESERVE</p>
                            <h1 style="margin: 0; color: #0b1f3a; font-size: 26px; font-weight: 700; line-height: 1.25;">Booking cancelled</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="border-radius: 16px; background: #ffffff; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.10);">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="padding: 30px 28px 12px;">
                                        <p style="margin: 0 0 12px; color: #d10a35; font-size: 12px; font-weight: 700; letter-spacing: 1.2px;">ROOM RESERVE</p>
                                        <h2 style="margin: 0; color: #0b1f3a; font-size: 25px; font-weight: 700; line-height: 1.25;">Your booking has been cancelled</h2>
                                        <p style="margin: 16px 0 0; color: #40526d; font-size: 16px; line-height: 1.55;">Hi {{ $visitorName }}, your room booking has been cancelled.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 28px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #fecaca; border-radius: 12px; background: #fff5f5;">
                                            <tr>
                                                <td style="padding: 18px 20px;">
                                                    <p style="margin: 0 0 14px; color: #c11233; font-size: 12px; font-weight: 700; letter-spacing: 0.8px;">CANCELLED BOOKING DETAILS</p>
                                                    <p style="margin: 0 0 4px; color: #667892; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Room</p>
                                                    <p style="margin: 0 0 14px; color: #0b1f3a; font-size: 16px; font-weight: 700; line-height: 1.45;">{{ $roomName }}</p>
                                                    <p style="margin: 0 0 4px; color: #667892; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Date</p>
                                                    <p style="margin: 0 0 14px; color: #0b1f3a; font-size: 16px; font-weight: 700; line-height: 1.45;">{{ $bookingDate }}</p>
                                                    <p style="margin: 0 0 4px; color: #667892; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Time</p>
                                                    <p style="margin: 0; color: #0b1f3a; font-size: 16px; font-weight: 700; line-height: 1.45;">{{ $bookingTime }}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                @if (filled($reason))
                                    <tr>
                                        <td style="padding: 4px 28px 12px;">
                                            <p style="margin: 0 0 6px; color: #667892; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Reason for cancellation</p>
                                            <p style="margin: 0; color: #40526d; font-size: 14px; line-height: 1.55; white-space: pre-wrap;">{{ $reason }}</p>
                                        </td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding: 16px 28px 30px;">
                                        <p style="margin: 0; color: #667892; font-size: 13px; line-height: 1.55;">Please contact the Room Reserve team if you need to make another booking.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 26px 20px 0; color: #71809a; font-size: 12px; line-height: 1.5;"><p style="margin: 0;">{{ $senderName }}</p></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
