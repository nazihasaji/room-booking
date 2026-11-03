import BookingController from './BookingController'
import BookingAvailabilityController from './BookingAvailabilityController'
import ProfileController from './ProfileController'
import Admin from './Admin'
import Auth from './Auth'
const Controllers = {
    BookingController: Object.assign(BookingController, BookingController),
BookingAvailabilityController: Object.assign(BookingAvailabilityController, BookingAvailabilityController),
ProfileController: Object.assign(ProfileController, ProfileController),
Admin: Object.assign(Admin, Admin),
Auth: Object.assign(Auth, Auth),
}

export default Controllers