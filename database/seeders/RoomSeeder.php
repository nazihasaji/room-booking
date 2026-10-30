<?php

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $renamedRooms = [
            'Cenderawasih Room 1' => 'Cenderawasih Room 1, KURW HQ',
            'Cenderawasih Room 2' => 'Cenderawasih Room 2, KURW HQ',
        ];

        foreach ($renamedRooms as $oldName => $newName) {
            Room::query()->where('name', $oldName)->update(['name' => $newName]);
        }

        $rooms = [
            'Cenderawasih Room 1, KURW HQ',
            'Cenderawasih Room 2, KURW HQ',
            'Menggris Room, KURW HQ',
            "D'Astana Room, Shorefield HQ",
            'Gamelan Room, Shorefield HQ',
            'ELR Office, ELR HQ',
            'Training Room Shorefield',
        ];

        foreach ($rooms as $name) {
            Room::query()->firstOrCreate(
                ['name' => $name],
                ['is_active' => true],
            );
        }
    }
}
