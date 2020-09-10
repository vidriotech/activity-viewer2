import React from "react";


export interface ColorMapperProps {
    selectedTimeseries: string;
    timeseriesList: string[];
}

export function ColorMapper(props: ColorMapperProps) {
    const colorMaps = [
        "bwr",
        "PiYG",
        "jet",
        "rainbow",
        "grey",
        "hot",
        "hsv"
    ];

    return <div>sup</div>
}
