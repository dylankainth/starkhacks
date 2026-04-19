import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Planet from './pages/Planet'
import Leaderboard from './pages/Leaderboard'
import Nav from './components/Nav'

export default function App() {
  return (
    <div className="min-h-screen bg-void text-white font-body">
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/planet/:name" element={<Planet />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  )
}
