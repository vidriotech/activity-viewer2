import React from "react";
import Typography from "@material-ui/core/Typography";

export interface HeaderPanelProps {
    busy: boolean;
}

export function HeaderPanel(props: HeaderPanelProps): React.ReactElement {
    return <Typography variant="h4"
                       component="h1"
                       gutterBottom >
        Mesoscale Activity Viewer
    </Typography>
}
