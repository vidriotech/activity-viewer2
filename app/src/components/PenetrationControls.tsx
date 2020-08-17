import React from 'react';
import { Container, List} from 'semantic-ui-react';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { IPenetrationTimeseriesResponse, IPenetrationData } from '../models/apiModels';

import { TimeseriesSelector, ITimeseriesSelectorProps } from './TimeseriesSelector';

interface ITimeseriesAesthetics {
    color: number | number[],
    opacity: number | number[],
    radius: number | number[],
}

export interface IPenetrationControlsProps {
    constants: AVConstants,
    penetration: IPenetrationData,
}

interface IPenetrationControlsState {
    timeseries: string[],
    aesthetic: ITimeseriesAesthetics,
}

export class PenetrationControls extends React.Component<IPenetrationControlsProps, IPenetrationControlsState> {
    private apiClient: APIClient;

    constructor(props: IPenetrationControlsProps) {
        super(props);

        this.state = {
            timeseries: [],
            aesthetic: {
                color: this.props.constants.defaultColor,
                opacity: this.props.constants.defaultOpacity,
                radius: this.props.constants.defaultRadius,
            }
        };
        
        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private fetchTimeseries() {
        this.apiClient.fetchAllTimeseries(this.props.penetration.penetrationId)
            .then((res: any) => res.data)
            .then((res: IPenetrationTimeseriesResponse) => {
                this.setState({timeseries: res.timeseries});
            })
            .catch((err: any) => {
                console.error(err);
            });
    }

    public componentDidMount() {
        this.fetchTimeseries();
    }

    public render() {
        const timeseriesList = (
            <List>
                {this.state.timeseries.map(t => {
                    const timeseriesSelectorProps: ITimeseriesSelectorProps = {
                        timeseriesId: t,
                        penetrationId: this.props.penetration.penetrationId,
                        constants: this.props.constants,
                    };
                    return <List.Item key={t}>{<TimeseriesSelector {...timeseriesSelectorProps} />}</List.Item>
                })}
            </List>
        );

        return (
            <Container>
                {timeseriesList}
                {/* <TimeseriesSelector {...timeseriesSelectorProps} /> */}
            </Container>
        );
    }
}