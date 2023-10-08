import ReactDOM from "react-dom/client";
import Intro from "./Screens/Intro.tsx";
import Kart from "./Screens/Kart/kart.tsx";
import Mii from "./Screens/Mii/mii.tsx";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
    {
        path: "/Donald/",
        element: <Intro />,
    },
    {
        path: "/Donald/Kart",
        element: <Kart />,
    },
    {
        path: "/Donald/Mii",
        element: <Mii />,
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
