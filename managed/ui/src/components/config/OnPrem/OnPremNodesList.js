// Copyright (c) YugaByte, Inc.

import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { FieldArray } from 'redux-form';
import { withRouter } from 'react-router';

import { getPromiseState } from 'utils/PromiseUtils';
import { isNonEmptyObject, isNonEmptyArray } from 'utils/ObjectUtils';
import { YBButton, YBModal } from '../../common/forms/fields';
import InstanceTypeForRegion from '../OnPrem/wizard/InstanceTypeForRegion';
import { YBBreadcrumb } from '../../common/descriptors';

class OnPremNodesList extends Component {
  constructor(props) {
    super(props);
    this.addNodeToList = this.addNodeToList.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.submitAddNodesForm = this.submitAddNodesForm.bind(this);
  }

  addNodeToList() {
    this.props.showAddNodesDialog();
  }

  hideModal() {
    this.props.reset();
    this.props.hideAddNodesDialog();
  }

  submitAddNodesForm(vals) {
    const {cloud: { supportedRegionList, accessKeys, providers }} = this.props;
    const onPremProvider = providers.data.find((provider) => provider.code === "onprem");
    const self = this;
    const currentCloudRegions = supportedRegionList.data.filter(region => region.provider.code === "onprem");
    const currentCloudAccessKey = accessKeys.data.filter(
      accessKey => accessKey.idKey.providerUUID === onPremProvider.uuid
    ).shift();
    // function to construct list of all zones in current configuration
    const zoneList = currentCloudRegions.reduce(function(azs, r) {
      azs[r.code] = [];
      r.zones.map((z) => azs[r.code][z.code.trim()] = z.uuid);
      return azs;
    }, {});

    // function takes in node list and returns node object keyed by zone
    const getInstancesKeyedByZone = function(instances, region, zoneList) {
      if (isNonEmptyArray(instances[region])) {
        return instances[region].reduce(function (acc, val) {
          if (isNonEmptyObject(val)) {
            const currentZone = val.zone.trim();
            const currentZoneUUID = zoneList[region][currentZone];
            acc[currentZoneUUID] = acc[currentZoneUUID] || [];
            if (val.instanceTypeIPs) {
              val.instanceTypeIPs.split(",").forEach((ip) => {
                acc[currentZoneUUID].push({
                  zone: currentZone,
                  region: region,
                  ip: ip.trim(),
                  instanceType: val.machineType,
                  sshUser: isNonEmptyObject(currentCloudAccessKey) ?
                    currentCloudAccessKey.keyInfo.sshUser : ""
                });
              });
            }
          }
          return acc;
        }, {});
      } else {
        return null;
      }
    };

    // function to construct final payload to be sent to middleware
    let instanceTypeList = [];
    if (isNonEmptyObject(vals.instances)) {
      instanceTypeList = Object.keys(vals.instances).map(function(region) {
        const instanceListByZone = getInstancesKeyedByZone(vals.instances, region, zoneList);
        return isNonEmptyObject(instanceListByZone) ? instanceListByZone : null;
      }).filter(Boolean);
      if (isNonEmptyArray(instanceTypeList)) {
        self.props.createOnPremNodes(instanceTypeList, onPremProvider.uuid);
      } else {
        this.hideModal();
      }
    }
    this.props.reset();
  }

  componentWillMount() {
    // Get OnPrem provider if provider list is already loaded during component load
    const onPremProvider = this.props.cloud.providers.data.find((provider)=>provider.code === "onprem");
    this.props.getRegionListItems(onPremProvider.uuid);
    this.props.getInstanceTypeListItems(onPremProvider.uuid);
  }

  render() {
    const {cloud :{nodeInstanceList, instanceTypes, supportedRegionList}, handleSubmit} = this.props;
    let nodeListItems = [];
    if (getPromiseState(nodeInstanceList).isSuccess()) {
      nodeListItems = nodeInstanceList.data.map(function(item) {
        return {
          nodeId: item.nodeUuID,
          inUse: item.inUse,
          ip: item.details.ip,
          instanceType: item.details.instanceType,
          region: item.details.region,
          zone: item.details.zone
        };
      });
    }
    const removeNodeItem = function(row, cell) {
      if (cell)
        return <i className={`fa fa-trash remove-cell-container`}/>;
    };

    const currentCloudRegions = supportedRegionList.data.filter(region => region.provider.code === "onprem");
    const regionFormTemplate = isNonEmptyArray(currentCloudRegions) ?
      currentCloudRegions.map(function(regionItem, idx){
        const zoneOptions = regionItem.zones.map(function(zoneItem, zoneIdx){
          return <option key={zoneItem+zoneIdx} value={zoneItem.code}>{zoneItem.code}</option>;});
        const machineTypeOptions = instanceTypes.data.map(function(machineTypeItem, mcIdx){
          return <option key={machineTypeItem+mcIdx} value={machineTypeItem.instanceTypeCode}>{machineTypeItem.instanceTypeCode}</option>;
        });
        zoneOptions.unshift(<option key={-1} value={""}>Select</option>);
        machineTypeOptions.unshift(<option key={-1} value={""}>Select</option>);
        return (
          <div key={`instance${idx}`}>
            <div className="instance-region-type">{regionItem.code}</div>
            <div className="form-field-grid">
              <FieldArray name={`instances.${regionItem.code}`} component={InstanceTypeForRegion}
                          zoneOptions={zoneOptions} machineTypeOptions={machineTypeOptions} formType={"modal"}/>
            </div>
          </div>
        );
      }) : null;

    return (
      <div>
        <span className="buttons pull-right">
          <YBButton btnText="Add Instances" btnIcon="fa fa-plus" onClick={this.addNodeToList}/>
        </span>

        <YBBreadcrumb to="/config/onprem">
          On-Premises Datacenter Config
        </YBBreadcrumb>
        <h3 className="no-top-margin">Instances</h3>

        <Row>
          <Col xs={12}>
            <BootstrapTable data={nodeListItems} >
              <TableHeaderColumn dataField="nodeId" isKey={true} hidden={true} />
              <TableHeaderColumn dataField="ip">IP</TableHeaderColumn>
              <TableHeaderColumn dataField="inUse">In Use</TableHeaderColumn>
              <TableHeaderColumn dataField="region">Region</TableHeaderColumn>
              <TableHeaderColumn dataField="zone">Zone</TableHeaderColumn>
              <TableHeaderColumn dataField="instanceType">Instance Type</TableHeaderColumn>
              <TableHeaderColumn dataField="" dataFormat={removeNodeItem}/>
            </BootstrapTable>
          </Col>
        </Row>
        <YBModal title={"Add Instances"} formName={"AddNodeForm"} visible={this.props.visibleModal === "AddNodesForm"}
                 onHide={this.hideModal} onFormSubmit={handleSubmit(this.submitAddNodesForm)}
                 showCancelButton={true} submitLabel="Add">
          <div className="on-prem-form-text">
            Enter IP addresses for the instances of each availability zone and instance type.
          </div>
          {regionFormTemplate}
        </YBModal>
      </div>
    );
  }
}

export default withRouter(OnPremNodesList);
