<?php

namespace App;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class GraphMailService
{
    public function sendBookingConfirmation(Booking $booking): void
    {
        if (! $this->isConfigured() || blank($booking->visitor_email)) {
            return;
        }

        try {
            $booking->loadMissing('room');
            $this->sendMessage(
                $booking->visitor_email,
                'Room booking confirmation',
                $this->confirmationBody($booking),
                'HTML',
            );
        } catch (Throwable $exception) {
            Log::warning('Unable to send Microsoft Graph booking confirmation.', [
                'booking_id' => $booking->id,
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    public function sendAccountInvitation(User $user, string $invitationUrl): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $this->sendMessage(
                $user->email,
                'You are invited to Room Reserve',
                $this->invitationBody($user, $invitationUrl),
                'HTML',
            );

            return true;
        } catch (Throwable $exception) {
            Log::warning('Unable to send Microsoft Graph account invitation.', [
                'user_id' => $user->id,
                'exception' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    public function sendPasswordResetLink(User $user, string $resetUrl): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $this->sendMessage(
                $user->email,
                'Reset your Room Reserve password',
                $this->passwordResetBody($user, $resetUrl),
                'HTML',
            );
        } catch (Throwable $exception) {
            Log::warning('Unable to send Microsoft Graph password reset link.', [
                'user_id' => $user->id,
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    public function sendAdminBookingNotifications(Booking $booking): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $adminEmails = User::query()
            ->where('is_super_admin', false)
            ->pluck('email');

        if ($adminEmails->isEmpty()) {
            return;
        }

        try {
            $booking->loadMissing('room');
            $accessToken = $this->accessToken();
            $content = $this->adminBookingNotificationBody($booking);

            foreach ($adminEmails as $adminEmail) {
                try {
                    $this->sendMessage(
                        $adminEmail,
                        'New room booking',
                        $content,
                        'HTML',
                        $accessToken,
                    );
                } catch (Throwable $exception) {
                    Log::warning('Unable to send Microsoft Graph administrator booking notification.', [
                        'booking_id' => $booking->id,
                        'admin_email' => $adminEmail,
                        'exception' => $exception->getMessage(),
                    ]);
                }
            }
        } catch (Throwable $exception) {
            Log::warning('Unable to prepare Microsoft Graph administrator booking notifications.', [
                'booking_id' => $booking->id,
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    public function sendBookingUpdateNotification(Booking $booking, ?string $reason): void
    {
        $this->sendVisitorBookingNotification(
            $booking,
            'Your room booking has been updated',
            'emails.booking-updated',
            $reason,
            'Unable to send Microsoft Graph booking update notification.',
        );
    }

    public function sendBookingCancellationNotification(Booking $booking, ?string $reason): void
    {
        $this->sendVisitorBookingNotification(
            $booking,
            'Your room booking has been cancelled',
            'emails.booking-cancelled',
            $reason,
            'Unable to send Microsoft Graph booking cancellation notification.',
        );
    }

    private function isConfigured(): bool
    {
        return filled(config('services.graph.tenant_id'))
            && filled(config('services.graph.client_id'))
            && filled(config('services.graph.client_secret'))
            && filled(config('services.graph.from_address'));
    }

    private function sendMessage(string $recipient, string $subject, string $content, string $contentType = 'Text', ?string $accessToken = null): void
    {
        $accessToken ??= $this->accessToken();
        $response = Http::acceptJson()
            ->withToken($accessToken)
            ->connectTimeout(3)
            ->timeout(8)
            ->post($this->mailUrl(), [
                'message' => [
                    'subject' => $subject,
                    'body' => [
                        'contentType' => $contentType,
                        'content' => $content,
                    ],
                    'toRecipients' => [[
                        'emailAddress' => [
                            'address' => $recipient,
                        ],
                    ]],
                ],
            ]);

        if ($response->status() !== 202) {
            throw new RuntimeException('Microsoft Graph did not accept the email.');
        }
    }

    private function accessToken(): string
    {
        $response = Http::asForm()
            ->acceptJson()
            ->connectTimeout(3)
            ->timeout(8)
            ->post($this->tokenUrl(), [
                'client_id' => config('services.graph.client_id'),
                'client_secret' => config('services.graph.client_secret'),
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ])
            ->throw();

        $accessToken = $response->json('access_token');

        if (! is_string($accessToken) || blank($accessToken)) {
            throw new RuntimeException('Microsoft Graph did not return an access token.');
        }

        return $accessToken;
    }

    private function tokenUrl(): string
    {
        return 'https://login.microsoftonline.com/'.rawurlencode((string) config('services.graph.tenant_id')).'/oauth2/v2.0/token';
    }

    private function mailUrl(): string
    {
        return 'https://graph.microsoft.com/v1.0/users/'.rawurlencode((string) config('services.graph.from_address')).'/sendMail';
    }

    private function confirmationBody(Booking $booking): string
    {
        return view('emails.booking-confirmation', [
            'visitorName' => $booking->visitor_name,
            'roomName' => $booking->room->name,
            'bookingDate' => $booking->start_at->format('l, j F Y'),
            'bookingTime' => $booking->start_at->format('g:i a').' – '.$booking->end_at->format('g:i a'),
            'senderName' => (string) config('services.graph.from_name'),
        ])->render();
    }

    private function sendVisitorBookingNotification(Booking $booking, string $subject, string $view, ?string $reason, string $logMessage): void
    {
        if (! $this->isConfigured() || blank($booking->visitor_email)) {
            return;
        }

        try {
            $booking->loadMissing('room');
            $this->sendMessage(
                $booking->visitor_email,
                $subject,
                $this->bookingNotificationBody($booking, $view, $reason),
                'HTML',
            );
        } catch (Throwable $exception) {
            Log::warning($logMessage, [
                'booking_id' => $booking->id,
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    private function bookingNotificationBody(Booking $booking, string $view, ?string $reason): string
    {
        return view($view, [
            'visitorName' => $booking->visitor_name,
            'roomName' => $booking->room->name,
            'bookingDate' => $booking->start_at->format('l, j F Y'),
            'bookingTime' => $booking->start_at->format('g:i a').' – '.$booking->end_at->format('g:i a'),
            'reason' => $reason,
            'senderName' => (string) config('services.graph.from_name'),
        ])->render();
    }

    private function invitationBody(User $user, string $invitationUrl): string
    {
        return view('emails.account-invitation', [
            'recipientName' => $user->name,
            'invitationUrl' => $invitationUrl,
            'expiresInMinutes' => (int) config('auth.passwords.users.expire'),
            'senderName' => (string) config('services.graph.from_name'),
        ])->render();
    }

    private function passwordResetBody(User $user, string $resetUrl): string
    {
        return view('emails.password-reset', [
            'recipientName' => $user->name,
            'resetUrl' => $resetUrl,
            'expiresInMinutes' => (int) config('auth.passwords.users.expire'),
            'senderName' => (string) config('services.graph.from_name'),
        ])->render();
    }

    private function adminBookingNotificationBody(Booking $booking): string
    {
        return view('emails.admin-booking-notification', [
            'roomName' => $booking->room->name,
            'bookingDate' => $booking->start_at->format('l, j F Y'),
            'bookingTime' => $booking->start_at->format('g:i a').' – '.$booking->end_at->format('g:i a'),
            'senderName' => (string) config('services.graph.from_name'),
        ])->render();
    }
}
