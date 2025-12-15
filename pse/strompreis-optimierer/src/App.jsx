import Sidebar from './components/Sidebar';
import Devices from './components/Devices';
import Plan from './components/Plan';
import './App.css'

function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-section">
        {window.location.pathname === '/geraete' ? <Devices /> : <></>}
        {window.location.pathname === '/ablaufplan' ? <Plan /> : <></>}
      </div>
    </div>
  )
}

export default App
