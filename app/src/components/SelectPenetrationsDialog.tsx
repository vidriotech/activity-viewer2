import React from "react";
import * as _ from "lodash";

import Checkbox from "@material-ui/core/Checkbox";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../models/penetration";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";

export interface SelectPenetrationsDialogProps {
    open: boolean;
    loadedPenetrationIds: string[];
    selectedPenetrations: Map<string, Penetration>;

    onCommitSelection(selectedPenetrationIds: string[]): void;
}

interface SelectPenetrationsDialogState {
    selectedPenetrationIds: Set<string>;
}

export class SelectPenetrationsDialog extends React.Component<SelectPenetrationsDialogProps, SelectPenetrationsDialogState> {
    constructor(props: SelectPenetrationsDialogProps) {
        super(props);

        this.state = {
            selectedPenetrationIds: new Set<string>(Array.from(this.props.selectedPenetrations.keys())),
        }
    }

    public componentDidUpdate(prevProps: Readonly<SelectPenetrationsDialogProps>): void {
        if (prevProps.loadedPenetrationIds !== this.props.loadedPenetrationIds) {
            this.setState(
                {selectedPenetrationIds: new Set<string>(Array.from(this.props.selectedPenetrations.keys()))}
            );
        }
    }

    public render(): React.ReactElement {
        const selectedPenetrationIds = this.state.selectedPenetrationIds;

        const nPenetrationsSelected = selectedPenetrationIds.size;
        const nPenetrationsLoaded = this.props.loadedPenetrationIds.length;

        return (
            <Dialog open={this.props.open}
                    onClose={(): void => this.props.onCommitSelection(null)}
                    fullWidth={true}
                    maxWidth="lg"
                    scroll="body" >
                <DialogTitle id="scroll-dialog-select-penetrations">Select penetrations to display</DialogTitle>
                <DialogContent>
                    <List dense
                          style={{width: "100%", maxHeight: 500, overflow: "auto", position: "relative"}}>
                        <ListItem key="select-all"
                                  dense
                                  button
                                  onClick={(): void => {
                                      let selectedPenetrationIds: Set<string>;

                                      if (nPenetrationsLoaded === nPenetrationsSelected) { // unselect all
                                          selectedPenetrationIds = new Set<string>();
                                      } else {
                                          selectedPenetrationIds = new Set<string>(
                                              this.props.loadedPenetrationIds
                                          );
                                      }

                                      this.setState({selectedPenetrationIds});
                                  }}>
                            <ListItemIcon>
                                <Checkbox edge="start"
                                          checked={nPenetrationsLoaded == nPenetrationsSelected}
                                          tabIndex={-1}
                                          disableRipple
                                          inputProps={{ "aria-labelledby": "select-all" }} />
                            </ListItemIcon>
                            <ListItemText id="select-all" primary={
                                nPenetrationsLoaded === nPenetrationsSelected ?
                                    "Unselect all" :
                                    "Select all"} />
                        </ListItem>
                        {this.props.loadedPenetrationIds.map((id) => {
                            const labelId = `checkbox-list-label-${id}`;

                            return (
                                <ListItem key={id}
                                          dense
                                          button
                                          onClick={(): void => {
                                              const selectedPenetrationIds = _.cloneDeep(this.state.selectedPenetrationIds);

                                              if (selectedPenetrationIds.has(id)) {
                                                  selectedPenetrationIds.delete(id);
                                              } else {
                                                  selectedPenetrationIds.add(id);
                                              }

                                              this.setState({selectedPenetrationIds});
                                          }}>
                                    <ListItemIcon>
                                        <Checkbox edge="start"
                                                  checked={this.state.selectedPenetrationIds.has(id)}
                                                  tabIndex={1}
                                                  disableRipple
                                                  inputProps={{ "aria-labelledby": labelId }} />
                                    </ListItemIcon>
                                    <ListItemText id={labelId} primary={id} />
                                </ListItem>
                            );
                        })}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button color="primary"
                            onClick={(): void => this.props.onCommitSelection(null)}>
                        Cancel
                    </Button>
                    <Button color="primary"
                            onClick={(): void => this.props.onCommitSelection(
                                Array.from(this.state.selectedPenetrationIds)
                            )} >
                        Commit
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}
