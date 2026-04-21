import { HashRouter, Routes, Route } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import SessionScreen from './screens/SessionScreen'
import BreakScreen from './screens/BreakScreen'
import StatsScreen from './screens/StatsScreen'
import PersonalScreen from './screens/PersonalScreen'
import TeamScreen from './screens/TeamScreen'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/lobby/:missionCode" element={<LobbyScreen />} />
        <Route path="/session/:missionCode" element={<SessionScreen />} />
        <Route path="/break/:missionCode" element={<BreakScreen />} />
        <Route path="/stats/:missionCode" element={<StatsScreen />} />
        <Route path="/personal" element={<PersonalScreen />} />
        <Route path="/team/:missionCode" element={<TeamScreen />} />
      </Routes>
    </HashRouter>
  )
}
