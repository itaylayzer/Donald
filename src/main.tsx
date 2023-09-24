import ReactDOM from 'react-dom/client'
import Intro from './Screens/Intro.tsx'
import Kart from "./Screens/Kart/main.tsx"
import './index.css'
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
    {
        path: "Donald",
        element: <Intro />,
    },
    {
        path: "/Donald/Kart",
        element: <Kart />,
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <App />
)
