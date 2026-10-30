<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('visitor_mobile')->nullable()->change();
            $table->unsignedSmallInteger('attendee_count')->default(1)->after('visitor_mobile');
            $table->string('refreshment_preference')->default('none')->after('attendee_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['attendee_count', 'refreshment_preference']);
            $table->string('visitor_mobile')->nullable(false)->change();
        });
    }
};
