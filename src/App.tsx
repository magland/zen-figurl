import { BrowserRouter } from "react-router-dom";
import MainWindow from "./MainWindow/MainWindow";

export function App() {
  return (
    <BrowserRouter>
      <MainWindow />
    </BrowserRouter>
  );
}

export default App;
