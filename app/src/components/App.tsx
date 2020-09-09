import React from 'react';
import * as _ from 'underscore';

import Typography from '@material-ui/core/Typography';

import { AVConstants } from '../constants';

import { CompartmentTree } from '../compartmentTree';
import { ISettingsResponse } from '../models/apiModels';

import { MainView, IMainViewProps } from './MainView';


export interface IAppProps {
    compartmentTree: CompartmentTree,
    constants: AVConstants,
    settings: ISettingsResponse,
}

export function App(props: IAppProps) {
    let mainViewProps: IMainViewProps = {
        compartmentTree: props.compartmentTree,
        constants: props.constants,
        settings: props.settings,
    }
    
    return (<div>
        <Typography variant='h3' component='h3'>
            Mesoscale Activity Viewer
        </Typography>
        <MainView {...mainViewProps} />
    </div>);
}
