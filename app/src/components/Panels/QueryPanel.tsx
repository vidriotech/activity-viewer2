import React from "react";

export interface QueryPanelProps {
    busy: boolean;
}

export function QueryPanel(props: QueryPanelProps): React.ReactElement {
    console.log(props);
    return <div>Hello this is the query panel.</div>
}
