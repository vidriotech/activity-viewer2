import React from "react";

import {createMuiTheme, ThemeProvider} from '@material-ui/core/styles';

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";
// eslint-disable-next-line import/no-unresolved
import { CompartmentTree } from "../compartmentTree";
// eslint-disable-next-line import/no-unresolved
import { AVSettings } from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { MainView, MainViewProps } from "./MainView";

const theme = createMuiTheme({
    palette: {
        primary: {
            main: "#1F77B4",
            contrastText: "#FFFFFF"
        },
        secondary: {
            main: "#FF7F0E",
            contrastText: "#FFFFFF"
        },
        error: {
            main: "#D62728",
        },
        warning: {
            main: "#BCBD22",
        },
        info: {
            main: "#17BECF",
        },
        success: {
            main: "#2CA02C",
        }
    }
});


export interface AppProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;
}

export function App(props: AppProps): React.ReactElement {
    const mainViewProps: MainViewProps = {
        compartmentTree: props.compartmentTree,
        constants: props.constants,
        settings: props.settings,
    }
    
    return <MainView {...mainViewProps} />;
}
