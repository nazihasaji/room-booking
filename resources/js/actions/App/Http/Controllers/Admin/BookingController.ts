import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/bookings',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Admin\BookingController::index
 * @see app/Http/Controllers/Admin/BookingController.php:22
 * @route '/admin/bookings'
 */
        indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    index.form = indexForm
/**
* @see \App\Http\Controllers\Admin\BookingController::store
 * @see app/Http/Controllers/Admin/BookingController.php:84
 * @route '/admin/bookings'
 */
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/admin/bookings',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\BookingController::store
 * @see app/Http/Controllers/Admin/BookingController.php:84
 * @route '/admin/bookings'
 */
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\BookingController::store
 * @see app/Http/Controllers/Admin/BookingController.php:84
 * @route '/admin/bookings'
 */
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Admin\BookingController::store
 * @see app/Http/Controllers/Admin/BookingController.php:84
 * @route '/admin/bookings'
 */
    const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: store.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\BookingController::store
 * @see app/Http/Controllers/Admin/BookingController.php:84
 * @route '/admin/bookings'
 */
        storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: store.url(options),
            method: 'post',
        })
    
    store.form = storeForm
/**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
export const update = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put","patch"],
    url: '/admin/bookings/{booking}',
} satisfies RouteDefinition<["put","patch"]>

/**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
update.url = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { booking: args }
    }

            if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
            args = { booking: args.id }
        }
    
    if (Array.isArray(args)) {
        args = {
                    booking: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        booking: typeof args.booking === 'object'
                ? args.booking.id
                : args.booking,
                }

    return update.definition.url
            .replace('{booking}', parsedArgs.booking.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
update.put = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})
/**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
update.patch = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

    /**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
    const updateForm = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: update.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'PUT',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
        updateForm.put = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: update.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PUT',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
            /**
* @see \App\Http\Controllers\Admin\BookingController::update
 * @see app/Http/Controllers/Admin/BookingController.php:99
 * @route '/admin/bookings/{booking}'
 */
        updateForm.patch = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: update.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'PATCH',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    update.form = updateForm
/**
* @see \App\Http\Controllers\Admin\BookingController::destroy
 * @see app/Http/Controllers/Admin/BookingController.php:115
 * @route '/admin/bookings/{booking}'
 */
export const destroy = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/admin/bookings/{booking}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Admin\BookingController::destroy
 * @see app/Http/Controllers/Admin/BookingController.php:115
 * @route '/admin/bookings/{booking}'
 */
destroy.url = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { booking: args }
    }

            if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
            args = { booking: args.id }
        }
    
    if (Array.isArray(args)) {
        args = {
                    booking: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        booking: typeof args.booking === 'object'
                ? args.booking.id
                : args.booking,
                }

    return destroy.definition.url
            .replace('{booking}', parsedArgs.booking.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\BookingController::destroy
 * @see app/Http/Controllers/Admin/BookingController.php:115
 * @route '/admin/bookings/{booking}'
 */
destroy.delete = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

    /**
* @see \App\Http\Controllers\Admin\BookingController::destroy
 * @see app/Http/Controllers/Admin/BookingController.php:115
 * @route '/admin/bookings/{booking}'
 */
    const destroyForm = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: destroy.url(args, {
                    [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                        _method: 'DELETE',
                        ...(options?.query ?? options?.mergeQuery ?? {}),
                    }
                }),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\BookingController::destroy
 * @see app/Http/Controllers/Admin/BookingController.php:115
 * @route '/admin/bookings/{booking}'
 */
        destroyForm.delete = (args: { booking: string | number | { id: string | number } } | [booking: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: destroy.url(args, {
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'DELETE',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'post',
        })
    
    destroy.form = destroyForm
const BookingController = { index, store, update, destroy }

export default BookingController