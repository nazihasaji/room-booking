import BookingController from './BookingController'
import UserController from './UserController'
const Admin = {
    BookingController: Object.assign(BookingController, BookingController),
UserController: Object.assign(UserController, UserController),
}

export default Admin