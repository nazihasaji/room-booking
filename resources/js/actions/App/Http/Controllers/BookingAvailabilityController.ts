import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
const BookingAvailabilityController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: BookingAvailabilityController.url(options),
    method: 'get',
})

BookingAvailabilityController.definition = {
    methods: ["get","head"],
    url: '/bookings/availability',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
BookingAvailabilityController.url = (options?: RouteQueryOptions) => {
    return BookingAvailabilityController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
BookingAvailabilityController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: BookingAvailabilityController.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
BookingAvailabilityController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: BookingAvailabilityController.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
    const BookingAvailabilityControllerForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: BookingAvailabilityController.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
        BookingAvailabilityControllerForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: BookingAvailabilityController.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\BookingAvailabilityController::__invoke
 * @see app/Http/Controllers/BookingAvailabilityController.php:13
 * @route '/bookings/availability'
 */
        BookingAvailabilityControllerForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: BookingAvailabilityController.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    BookingAvailabilityController.form = BookingAvailabilityControllerForm
export default BookingAvailabilityController