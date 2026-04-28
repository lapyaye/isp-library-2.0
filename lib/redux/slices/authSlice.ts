import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { SessionUser } from "../../db/types"

interface AuthState {
    user: SessionUser
    accessToken: string | null
    isAuthenticated: boolean
}

const initialState: AuthState = {
    user: {
        id: "",
        user_id: "",
        email: "",
        username: "",
        isAdmin: false,
        isVerified: false,
        created_at: "",
    },
    accessToken: null,
    isAuthenticated: false,
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ user: SessionUser; accessToken: string }>
        ) => {
            state.user = action.payload.user
            state.accessToken = action.payload.accessToken
            state.isAuthenticated = true
        },
        hydrate: (state, action: PayloadAction<{ user: SessionUser }>) => {
            state.user = action.payload.user
            state.isAuthenticated = !!action.payload.user.user_id
        },
        logout: (state) => {
            state.user = {
                id: "",
                user_id: "",
                email: "",
                username: "",
                isAdmin: false,
                created_at: "",
            }
            state.accessToken = null
            state.isAuthenticated = false
        },
    },
    selectors: {
        selectUser: (state) => state.user,
        selectIsAuthenticated: (state) => state.isAuthenticated,
        selectAccessToken: (state) => state.accessToken,
    },
})

export const { setCredentials, logout, hydrate } = authSlice.actions
export const { selectUser, selectIsAuthenticated, selectAccessToken } = authSlice.selectors
export default authSlice.reducer
