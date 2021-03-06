import * as React from 'react'
import * as Relay from 'react-relay'
import {withRouter} from 'react-router'
import mapProps from 'map-props'
import ClickOutside from 'react-click-outside'
import TypeSelection from './TypeSelection'
import Tether from '../../../components/Tether/Tether'
import ScrollBox from '../../../components/ScrollBox/ScrollBox'
import {onFailureShowNotification} from '../../../utils/relay'
import {valueToString, stringToValue} from '../../../utils/valueparser'
import TagsInput from 'react-tagsinput'
import Help from '../../../components/Help/Help'
import Datepicker from '../../../components/Datepicker/Datepicker'
import Loading from '../../../components/Loading/Loading'
import ToggleButton from '../../../components/ToggleButton/ToggleButton'
import {ToggleSide} from '../../../components/ToggleButton/ToggleButton'
import AddFieldMutation from '../../../mutations/AddFieldMutation'
import UpdateFieldMutation from '../../../mutations/UpdateFieldMutation'
import {Field, Model} from '../../../types/types'
import {ShowNotificationCallback} from '../../../types/utils'
import {GettingStartedState} from '../../../types/gettingStarted'
import {emptyDefault} from '../utils'
import {showNotification} from '../../../actions/notification'
import {connect} from 'react-redux'
import {nextStep, showDonePopup} from '../../../actions/gettingStarted'
import {bindActionCreators} from 'redux'
const classes: any = require('./FieldPopup.scss')

require('react-tagsinput/react-tagsinput.css')

interface Props {
  field?: Field
  model: Model
  params: any
  allModels: Model[]
  router: ReactRouter.InjectedRouter
  gettingStartedState: GettingStartedState
  nextStep: any
  showNotification: ShowNotificationCallback
  showDonePopup: () => void
}

interface State {
  loading: boolean
  name: string
  typeIdentifier: string
  isRequired: boolean
  isList: boolean
  enumValues: string[]
  useDefaultValue: boolean
  defaultValue: any
  reverseRelationField: Field | any
  useMigrationValue: boolean
  migrationValue: any
}

class FieldPopup extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)

    const {field} = props
    const typeIdentifier = field ? field.typeIdentifier : 'Int'
    const isList = field ? field.isList : false
    const enumValues = field ? field.enumValues : []
    const tmpField = {typeIdentifier, isList, enumValues} as Field

    this.state = {
      loading: false,
      name: field ? field.name : '',
      typeIdentifier,
      isRequired: field ? field.isRequired : true,
      isList,
      enumValues,
      useDefaultValue: field ? field.defaultValue !== null : null,
      defaultValue: field ? stringToValue(field.defaultValue, tmpField) : emptyDefault(tmpField),
      reverseRelationField: field ? field.reverseRelationField : null,
      useMigrationValue: false,
      migrationValue: emptyDefault({typeIdentifier, isList, enumValues: []} as Field),
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.name === 'imageUrl' &&
        this.props.gettingStartedState.isCurrentStep('STEP2_ENTER_FIELD_NAME_IMAGEURL')) {
      this.props.nextStep()
    }

    if (this.state.typeIdentifier === 'String' &&
        this.props.gettingStartedState.isCurrentStep('STEP2_SELECT_TYPE_IMAGEURL')) {
      this.props.nextStep()
    }
  }

  componentWillMount() {
    window.addEventListener('keydown', this.listenForKeys, false)
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.listenForKeys, false)
  }

  render() {
    if (this.state.loading) {
      return (
        <div className={classes.background}>
          <Loading color='#fff'/>
        </div>
      )
    }

    const dataExists = this.props.model.itemCount > 0
    const needsMigrationValue = this.needsMigrationValue()
    const showMigrationValue = needsMigrationValue || (dataExists && !this.props.field)

    return (
      <div className={classes.background}>
        <ScrollBox innerContainerClassName={classes.scrollBox}>
          <ClickOutside onClickOutside={() => this.close()}>
            <div className={classes.container}>
              <div className={classes.head}>
                <div className={classes.title}>
                  {this.props.field ? 'Change field' : 'Create a new field'}
                </div>
                <div className={classes.subtitle}>
                  You can change this field later
                </div>
              </div>
              <div className={classes.body}>
                <div className={classes.row}>
                  <div className={classes.left}>
                    Choose a name for your field
                    <Help text='Fieldnames must be camelCase like "firstName" or "dateOfBirth".'/>
                  </div>
                  <div className={classes.right}>
                    <Tether
                      steps={[{
                        step: 'STEP2_ENTER_FIELD_NAME_IMAGEURL',
                        title: 'Call the field "imageUrl"',
                        description: 'Field names always start lower case.',
                      }]}
                      offsetX={5}
                      offsetY={5}
                      width={240}
                    >
                      <input
                        autoFocus={!this.props.field}
                        type='text'
                        placeholder='Fieldname'
                        defaultValue={this.state.name}
                        onChange={(e: any) => this.setState({ name: (e.target as HTMLInputElement).value } as State)}
                        onKeyUp={(e: any) => e.keyCode === 13 ? this.submit() : null}
                      />
                    </Tether>
                  </div>
                </div>
                <div className={classes.row}>
                  <div className={classes.left}>
                    Select the type of data
                    <Help text={`Your field can either store scalar values such as text or numbers
                    or setup relations between existing models.`}/>
                  </div>
                  <div className={classes.right}>
                    <Tether
                      steps={[{
                        step: 'STEP2_SELECT_TYPE_IMAGEURL',
                        title: 'Select the type "String"',
                      }]}
                      offsetX={5}
                      offsetY={5}
                      width={240}
                      side={'top'}
                    >
                      <TypeSelection
                        selected={this.state.typeIdentifier}
                        select={(typeIdentifier) => this.updateTypeIdentifier(typeIdentifier)}
                      />
                    </Tether>
                  </div>
                </div>
                {this.state.typeIdentifier === 'Enum' &&
                <div className={classes.row}>
                  <div className={classes.enumLeft}>
                    Enum Values
                    <Help text={`List all possible values for your enum field.
                      Good value names are either Capitalized or UPPERCASE.`}/>
                  </div>
                  <div className={classes.enumRight}>
                    <TagsInput
                      onlyUnique
                      addOnBlur
                      addKeys={[9, 13, 32]}
                      value={this.state.enumValues}
                      onChange={(enumValues) => this.updateEnumValues(enumValues)}
                    />
                  </div>
                </div>
                }
                <div className={classes.rowBlock}>
                  <div className={classes.row}>
                    <div className={classes.left}>
                      Is this field required?
                      <Help text={`Required fields always must have a value and cannot be "null".
                        If you don't setup a default value you will need to
                        provide a value for each create mutation.`}/>
                    </div>
                    <div className={classes.right}>
                      <label>
                        <input
                          type='checkbox'
                          checked={this.state.isRequired}
                          onChange={(e: any) => this.setState({
                              isRequired: (e.target as HTMLInputElement).checked,
                            } as State)}
                          onKeyUp={(e: any) => e.keyCode === 13 ? this.submit() : null}
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  <div className={classes.row}>
                    <div className={classes.left}>
                      Store multiple values
                      <Help text={`Normaly you just want to store a single value
                        but you can also save a list of values.`}/>
                    </div>
                    <div className={classes.right}>
                      <label>
                        <input
                          type='checkbox'
                          checked={this.state.isList}
                          onChange={(e: any) => this.updateIsList((e.target as HTMLInputElement).checked)}
                          onKeyUp={(e: any) => e.keyCode === 13 ? this.submit() : null}
                        />
                        List
                      </label>
                    </div>
                  </div>
                </div>
                {showMigrationValue &&
                <div className={classes.row}>
                  <div className={classes.left}>
                    <label>
                      <input
                        type='checkbox'
                        disabled={needsMigrationValue}
                        checked={this.state.useMigrationValue || needsMigrationValue}
                        onChange={(e: any) => this.setState({
                              useMigrationValue: (e.target as HTMLInputElement).checked,
                            } as State)}
                      />
                      Migration value
                    </label>
                    <Help text={this.props.field
                      ? `The migration value will be used to replace all existing values
                      for this field. Be careful, this step cannot be undone.
                      Note: New data items won't be affected, please see "Default value".`
                      : `The migration value will be used to populate this field for existing data items.
                      Note: New data items won't be affected, please see "Default value".`}/>
                  </div>
                  <div className={`
                    ${classes.right} ${(this.state.useMigrationValue || needsMigrationValue) ? null : classes.disabled}
                    `}>
                    {this.renderValueInput(
                      this.state.migrationValue,
                      'Migration value',
                      this.setMigrationValue
                    )}
                  </div>
                </div>
                }
                <div className={classes.row}>
                  <div className={classes.left}>
                    <label>
                      <input
                        type='checkbox'
                        checked={this.state.useDefaultValue}
                        onChange={(e: any) => this.setState({
                            useDefaultValue: (e.target as HTMLInputElement).checked,
                          } as State)}
                      />
                      Default value
                    </label>
                    <Help text={`You can provide a default value for every newly created data item.
                      The default value will be applied to both required and non-required fields.`}/>
                  </div>
                  <div className={`${classes.right} ${this.state.useDefaultValue ? null : classes.disabled}`}>
                    {this.renderValueInput(
                      this.state.defaultValue,
                      'Default value',
                      this.setDefaultValue
                    )}
                  </div>
                </div>
              </div>
              <div className={classes.foot}>
                <div className={classes.button} onClick={() => this.close()}>
                  Cancel
                </div>
                <Tether
                  steps={[{
                    step: 'STEP2_CLICK_CONFIRM_IMAGEURL',
                    title: `That's it, click create!`,
                  }]}
                  offsetX={5}
                  offsetY={5}
                  width={240}
                >
                  <button
                    className={`${classes.button} ${this.isValid() ? classes.green : classes.disabled}`}
                    onClick={this.submit}
                  >
                    {this.props.field ? 'Save' : 'Create'}
                  </button>
                </Tether>
              </div>
            </div>
          </ClickOutside>
        </ScrollBox>
      </div>
    )
  }

  private listenForKeys = (e: KeyboardEvent) => {
    if (e.keyCode === 13 && e.target === document.body) {
      this.submit()
    } else if (e.keyCode === 27 && e.target === document.body) {
      this.close()
    }
  }

  private close = () => {
    this.props.router.goBack()
  }

  private submit = () => {
    if (this.props.field) {
      this.update()
    } else {
      this.create()
    }
  }

  private create = () => {
    if (!this.isValid()) {
      return
    }

    if (this.props.gettingStartedState.isCurrentStep('STEP2_CLICK_CONFIRM_IMAGEURL')) {
      if (this.state.name === 'imageUrl' && this.state.typeIdentifier === 'String') {
        this.props.showDonePopup()
        this.props.nextStep()
      } else {
        this.props.showNotification({
          level: 'warning',
          message: 'Make sure that the name is "imageUrl" and the type is "String".',
        })
        return
      }
    }
    if (this.props.gettingStartedState.isCurrentStep('STEP2_CREATE_FIELD_DESCRIPTION')) {
      if (this.state.name === 'description' && this.state.typeIdentifier === 'String') {
        this.props.showDonePopup()
        this.props.nextStep()
      } else {
        this.props.showNotification({
          level: 'warning',
          message: 'Make sure that the name is "description" and the type is "String".',
        })
        return
      }
    }

    this.setState({loading: true} as State)

    const {
      name,
      typeIdentifier,
      enumValues,
      isList,
      isRequired,
      useDefaultValue,
      defaultValue,
      reverseRelationField,
    } = this.state

    const field = {isList, typeIdentifier} as Field
    const wrappedMigrationValue = this.state.migrationValue
    const migrationValue = (this.needsMigrationValue() || this.state.useMigrationValue)
      ? valueToString(wrappedMigrationValue, field, true)
      : null

    Relay.Store.commitUpdate(
      new AddFieldMutation({
        modelId: this.props.model.id,
        name,
        typeIdentifier,
        enumValues,
        isList,
        isRequired: isRequired,
        defaultValue: useDefaultValue ? valueToString(defaultValue, field, false) : null,
        relationId: ((reverseRelationField || {} as any).relation || {} as any).id,
        migrationValue,
      }),
      {
        onSuccess: () => {
          analytics.track('models/structure: created field', {
            project: this.props.params.projectName,
            model: this.props.params.modelName,
            field: name,
          })
          this.close()
        },
        onFailure: (transaction) => {
          onFailureShowNotification(transaction, this.props.showNotification)
          this.setState({loading: false} as State)
        },
      }
    )
  }

  private update = () => {
    if (!this.isValid()) {
      return
    }

    this.setState({loading: true} as State)

    const {
      name,
      typeIdentifier,
      enumValues,
      isList,
      isRequired,
      useDefaultValue,
      defaultValue,
      reverseRelationField,
    } = this.state

    const field = {isList, typeIdentifier} as Field
    const wrappedMigrationValue = this.state.migrationValue
    const migrationValue = (this.needsMigrationValue() || this.state.useMigrationValue) && !isList
      ? valueToString(wrappedMigrationValue, field, true)
      : null

    Relay.Store.commitUpdate(
      new UpdateFieldMutation({
        fieldId: this.props.field.id,
        name,
        typeIdentifier,
        enumValues,
        isList,
        isRequired: isRequired,
        defaultValue: useDefaultValue ? valueToString(defaultValue, field, false) : null,
        relationId: ((reverseRelationField || {} as any).relation || {} as any).id,
        migrationValue,
      }),
      {
        onSuccess: () => {
          analytics.track('models/structure: updated field', {
            project: this.props.params.projectName,
            model: this.props.params.modelName,
            field: name,
          })

          this.close()
        },
        onFailure: (transaction) => {
          onFailureShowNotification(transaction, this.props.showNotification)
          this.setState({loading: false} as State)
        },
      }
    )
  }

  private isValid = (): boolean => {
    if (this.state.name === '') {
      return false
    }

    if (this.needsMigrationValue() && this.state.migrationValue === null) {
      return false
    }

    if (this.state.typeIdentifier === 'Enum' && this.state.enumValues.length === 0) {
      return false
    }

    return true
  }

  private needsMigrationValue = (): boolean => {
    if (this.props.model.itemCount === 0) {
      return false
    }

    const changedType = this.props.field && this.state.typeIdentifier !== this.props.field.typeIdentifier
    const changedRequired = this.props.field && !this.props.field.isRequired && this.state.isRequired
    const newRequiredField = !this.props.field && this.state.isRequired

    return changedType || changedRequired || newRequiredField
  }

  private updateTypeIdentifier(typeIdentifier: string) {
    const {field} = this.props

    const useMigrationValue = (field && field.typeIdentifier === typeIdentifier)
      ? false
      : this.state.useMigrationValue
    const {isList, enumValues} = this.state
    const tmpField = {typeIdentifier, isList, enumValues} as Field

    this.setState({
      typeIdentifier,
      isRequired: field ? field.isRequired : true,
      isList,
      reverseRelationField: field ? field.reverseRelationField : null,
      defaultValue: field ? stringToValue(field.defaultValue, tmpField) : emptyDefault(tmpField),
      migrationValue: emptyDefault({typeIdentifier, isList, enumValues} as Field),
      useMigrationValue,
    } as State)
  }

  private updateIsList(isList: boolean) {
    const {typeIdentifier, enumValues} = this.state

    this.setState({
      isList,
      migrationValue: emptyDefault({typeIdentifier, isList, enumValues} as Field),
    } as State)
  }

  private updateEnumValues(enumValues: string[]) {
    const {typeIdentifier, isList} = this.state

    this.setState({
      enumValues,
      migrationValue: emptyDefault({typeIdentifier, isList, enumValues} as Field),
    } as State)
  }

  private setDefaultValue = (defaultValue: any) => {
    if (!this.state.useDefaultValue) {
      return
    }

    this.setState({defaultValue} as State)
  }

  private setMigrationValue = (migrationValue: any) => {
    if (!this.state.useMigrationValue && !this.needsMigrationValue()) {
      migrationValue = null
    }
    this.setState({migrationValue} as State)
  }

  private renderValueInput(value: any, placeholder: string, changeCallback: (v: any) => void) {
    const field = {
      isList: this.state.isList,
      typeIdentifier: this.state.typeIdentifier,
    } as Field

    const wrappedValue = value
    const valueString = valueToString(wrappedValue, field, false)

    if (field.isList) {
      return (
        <input
          type='text'
          ref='input'
          placeholder={placeholder}
          value={valueString}
          onChange={(e: any) => changeCallback((e.target as HTMLInputElement).value)}
        />
      )
    }

    switch (this.state.typeIdentifier) {
      case 'Int':
        return (
          <input
            type='number'
            ref='input'
            placeholder='Default value'
            value={valueString}
            onChange={(e: any) => changeCallback((e.target as HTMLInputElement).value)}
          />
        )
      case 'Float':
        return (
          <input
            type='number'
            step='any'
            ref='input'
            placeholder={placeholder}
            value={valueString}
            onChange={(e: any) => changeCallback(e.target.value)}
          />
        )
      case 'Boolean':
        return (
          <ToggleButton
            leftText='false'
            rightText='true'
            side={valueString === 'true' ? ToggleSide.Right : ToggleSide.Left}
            onChange={(side) => changeCallback(side === ToggleSide.Left ? false : true)}
          />
        )
      case 'Enum':
        return (
          <select
            value={valueString}
            onChange={(e: any) => changeCallback(e.target.value)}
          >
            {this.state.enumValues.map((enumValue) => (
              <option key={enumValue}>{enumValue}</option>
            ))}
          </select>
        )
      case 'DateTime':
        return (
          <Datepicker
            defaultValue={new Date(valueString)}
            onChange={(m) => changeCallback(m.toDate())}
            defaultOpen={false}
            applyImmediately={true}
          />
        )
      default:
        return (
          <input
            type='text'
            ref='input'
            placeholder={placeholder}
            value={valueString}
            onChange={(e: any) => changeCallback((e.target as HTMLInputElement).value)}
          />
        )
    }
  }
}

const mapStateToProps = (state) => {
  return {
    gettingStartedState: state.gettingStarted.gettingStartedState,
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({nextStep, showDonePopup, showNotification}, dispatch)
}

const ReduxContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(FieldPopup))

const MappedFieldPopup = mapProps({
  params: (props) => props.params,
  allModels: (props) => props.viewer.project.models.edges.map((edge) => edge.node),
  field: (props) => props.viewer.field,
  model: (props) => props.viewer.model,
})(ReduxContainer)

export default Relay.createContainer(MappedFieldPopup, {
  initialVariables: {
    modelName: null, // injected from router
    projectName: null, // injected from router
    fieldName: null, // injected from router
    fieldExists: false,
  },
  prepareVariables: (prevVariables: any) => (Object.assign({}, prevVariables, {
    fieldExists: !!prevVariables.fieldName,
  })),
  fragments: {
    viewer: () => Relay.QL`
      fragment on Viewer {
        model: modelByName(projectName: $projectName, modelName: $modelName) {
          id
          itemCount
        }
        field: fieldByName(
        projectName: $projectName
        modelName: $modelName
        fieldName: $fieldName
        ) @include(if: $fieldExists) {
          id
          name
          typeIdentifier
          isRequired
          isList
          enumValues
          defaultValue
          relation {
            id
          }
          reverseRelationField {
            name
          }
        }
        project: projectByName(projectName: $projectName) {
          models(first: 100) {
            edges {
              node {
                id
                name
                unconnectedReverseRelationFieldsFrom(relatedModelName: $modelName) {
                  id
                  name
                  relation {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `,
  },
})
