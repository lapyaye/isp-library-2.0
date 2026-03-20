import { configureStore } from "@reduxjs/toolkit"
import { libraryApi } from "./services/libraryApi"
import authReducer from "./slices/authSlice"
import uiReducer from "./slices/uiSlice"

export const makeStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer,
            ui: uiReducer,
            [libraryApi.reducerPath]: libraryApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(libraryApi.middleware),
    })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
