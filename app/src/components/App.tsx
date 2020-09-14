import React from "react";

import Typography from "@material-ui/core/Typography";

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";

// eslint-disable-next-line import/no-unresolved
import { CompartmentTree } from "../compartmentTree";
// eslint-disable-next-line import/no-unresolved
import { AVSettings } from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { MainView, MainViewProps } from "./MainView";


export interface AppProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;
}

export function App(props: AppProps) {
    const mainViewProps: MainViewProps = {
        compartmentTree: props.compartmentTree,
        constants: props.constants,
        settings: props.settings,
    }
    
    return (<div>
        <Typography variant="h3" component="h3">
            Mesoscale Activity Viewer
        </Typography>
        <MainView {...mainViewProps} />
    </div>);
}
