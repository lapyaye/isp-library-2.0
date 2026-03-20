import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "../store"

interface UIState {
    hasSeenPreloader: boolean
}

const initialState: UIState = {
    hasSeenPreloader: false,
}

export const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        setHasSeenPreloader: (state, action: PayloadAction<boolean>) => {
            state.hasSeenPreloader = action.payload
        },
    },
})

export const { setHasSeenPreloader } = uiSlice.actions

export const selectHasSeenPreloader = (state: RootState) => state.ui.hasSeenPreloader

export default uiSlice.reducer
