import React from "react";

import Typography from "@material-ui/core/Typography";

export interface HeaderProps {
    name: string;
    children?: React.ReactElement[];
}

export function Header(props: HeaderProps): React.ReactElement {
    return (
        <div>
            <Typography>{props.name}</Typography>
        </div>
    );
}
