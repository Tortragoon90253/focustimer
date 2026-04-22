import { HashRouter, Routes, Route } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen'
import MissionHubScreen from './screens/MissionHubScreen'
import LobbyScreen from './screens/LobbyScreen'
import SessionScreen from './screens/SessionScreen'
import BreakScreen from './screens/BreakScreen'
import StatsScreen from './screens/StatsScreen'
import PersonalScreen from './screens/PersonalScreen'
import TeamScreen from './screens/TeamScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/hub" element={<MissionHubScreen />} />
        <Route path="/lobby/:missionCode" element={<LobbyScreen />} />
        <Route path="/session/:missionCode" element={<SessionScreen />} />
        <Route path="/break/:missionCode" element={<BreakScreen />} />
        <Route path="/stats/:missionCode" element={<StatsScreen />} />
        <Route path="/personal" element={<PersonalScreen />} />
        <Route path="/team/:missionCode" element={<TeamScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
      </Routes>
    </HashRouter>
  )
}
