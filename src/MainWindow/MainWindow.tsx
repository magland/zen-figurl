import { FunctionComponent } from "react";
import { useRoute } from "../route";
import HomePage from "../HomePage/HomePage";
import SitePage from "../SitePage/SitePage";

const MainWindow: FunctionComponent = () => {

    const {route} = useRoute()

    return (
        route.page === 'home' ? (
            <HomePage />
        ) : route.page === 'site' ? (
            <SitePage />
        ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <div>Unknown page: {(route as any).page}</div>
        )
    )
}

export default MainWindow