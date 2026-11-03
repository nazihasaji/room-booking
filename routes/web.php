<?php

use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\BookingAvailabilityController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/bookings');

Route::get('/bookings', [BookingController::class, 'index'])->name('bookings.index');
Route::get('/bookings/availability', BookingAvailabilityController::class)->name('bookings.availability');
Route::post('/bookings', [BookingController::class, 'store'])->name('bookings.store');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/bookings')->name('dashboard');
    Route::resource('bookings', AdminBookingController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::middleware('super-admin')->group(function () {
        Route::resource('users', AdminUserController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/auth.php';
