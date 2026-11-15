import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Some screens are loaded on demand, so a test may wait for the screen's code as well as its data.
// One second (the default) is too tight when every test file runs at once, as on the publishing machine.
configure({ asyncUtilTimeout: 5000 })
