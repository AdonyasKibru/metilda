import React from 'react'
import { withRouter } from 'react-router-dom'
import * as ROUTES from '../constants/routes'
import './landing.scss'
interface State {}
interface Props {
  history: any
}

export class Landing extends React.Component<Props, State> {
  constructor(props: any) {
    super(props)
  }

  displayLoginPage = () => {
    this.props.history.push(ROUTES.SIGN_IN)
  }

  render() {
    return (
      <div className="landing_Page">
        <h3>MeTILDA</h3>
        <h5> Melodic Transciption in Language Documentation and Application</h5>
        <p>
          {' '}
          Learning and Analysis Platform for Linguistic Researchers and
          teachers/students
        </p>
        <button className="login_Button" onClick={this.displayLoginPage}>
          {' '}
          Login/Sign Up
        </button>
        <p />
        <p> '[Insert a demo of the application here]'</p>
        {/* <img src={metilda} alt="Logo" className='metilda_Logo'/>; */}
      </div>
    )
  }
}

export default withRouter(Landing as any)
