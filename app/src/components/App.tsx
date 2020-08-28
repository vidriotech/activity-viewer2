import React from 'react';
import * as _ from 'underscore';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { ISettingsResponse, IPenetrationData, IPenetrationResponse } from '../models/apiModels';
import { MainView, IMainViewProps } from './MainView';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';


export interface IAppProps {
    compartmentTree: CompartmentTree,
    constants: AVConstants,
    settings: ISettingsResponse,
}

export interface IAppState {
    availablePenetrations: IPenetrationData[],
    visibleCompartments: ICompartmentView[],
}

export class App extends React.Component<IAppProps, IAppState> {
    private apiClient: APIClient;

    constructor(props: IAppProps) {
        super(props)
        this.state = {
            availablePenetrations: [],
            visibleCompartments: [
                _.extend(this.props.compartmentTree.getCompartmentNodeByName('root'), {isVisible: true})],
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private handleUpdateSelectedCompartments(added: string[], removed: string[]) {
        let compartmentViews = this.state.visibleCompartments.slice();
        const compartmentNames = compartmentViews.map((c: ICompartmentView) => c.name);

        // add and make visible new compartments
        added.forEach((name: string) => {
            const idx = compartmentNames.indexOf(name);
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                if (compartment !== null) {
                    compartmentViews.push(_.extend(compartment, {isVisible: true}));
                }
            } else {
                compartmentViews[idx].isVisible = true;
            }
        });

        removed.forEach((name: string) => {
            const idx = compartmentNames.indexOf(name);
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                compartmentViews.push(_.extend(compartment, {isVisible: false}));
            } else {
                compartmentViews[idx].isVisible = false;
            }
        });

        this.handleUpdateCompartmentViews(compartmentViews);
    }

    public handleUpdateCompartmentViews(compartmentViews: ICompartmentView[]) {
        this.setState({visibleCompartments: compartmentViews});
    }

    public componentDidMount() {
        this.apiClient.fetchPenetrations()
            .then((res: any) => res.data)
            .then((data: IPenetrationResponse) => {
                this.setState({availablePenetrations: data.penetrations});
            })
            .catch((err: Error) => {
                console.error(err);
                window.alert(err.message);
            });
    }

    public render() {
        let mainViewProps: IMainViewProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentTree: this.props.compartmentTree,
            visibleCompartments: this.state.visibleCompartments,
            constants: this.props.constants,
            settings: this.props.settings,
            onUpdateCompartmentViews: this.handleUpdateCompartmentViews.bind(this),
            onUpdateSelectedCompartments: this.handleUpdateSelectedCompartments.bind(this),
        }
        
        return (<div>
            <Typography variant='h3' component='h3'>
                Mesoscale Activity Viewer
            </Typography>
            <MainView {...mainViewProps} />
        </div>);
    }
}
