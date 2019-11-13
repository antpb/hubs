import React, { Component } from "react";
import PropTypes from "prop-types";
import { IntlProvider, FormattedMessage, addLocaleData } from "react-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import en from "react-intl/locale-data/en";

import configs from "../utils/configs";
import IfFeature from "./if-feature";
import { lang, messages } from "../utils/i18n";
import { playVideoWithStopOnBlur } from "../utils/video-utils.js";
import homeVideoWebM from "../assets/video/home.webm";
import homeVideoMp4 from "../assets/video/home.mp4";
import hubLogo from "../assets/images/hub-preview-light-no-shadow.png";
import bpLogo from "../assets/images/bp.png";
import discordLogoSmall from "../assets/images/discord-logo-small.png";
import mozLogo from "../assets/images/moz-logo-black.png";
import classNames from "classnames";
import { isLocalClient, createAndRedirectToNewHub, connectToReticulum } from "../utils/phoenix-utils";
import maskEmail from "../utils/mask-email";
import checkIsMobile from "../utils/is-mobile";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";
import mediaBrowserStyles from "../assets/stylesheets/media-browser.scss";
import AuthChannel from "../utils/auth-channel";

import styles from "../assets/stylesheets/index.scss";

import AuthDialog from "./auth-dialog.js";
import JoinUsDialog from "./join-us-dialog.js";
import ReportDialog from "./report-dialog.js";
import SignInDialog from "./sign-in-dialog.js";
import UpdatesDialog from "./updates-dialog.js";
import DialogContainer from "./dialog-container.js";
import MediaTiles from "./media-tiles";

addLocaleData([...en]);

const isMobile = checkIsMobile();

class HomeRoot extends Component {
  static propTypes = {
    intl: PropTypes.object,
    store: PropTypes.object,
    authChannel: PropTypes.object,
    authVerify: PropTypes.bool,
    authTopic: PropTypes.string,
    authToken: PropTypes.string,
    authPayload: PropTypes.string,
    authOrigin: PropTypes.string,
    listSignup: PropTypes.bool,
    report: PropTypes.bool,
    installEvent: PropTypes.object,
    hideHero: PropTypes.bool,
    showAdmin: PropTypes.bool,
    favoriteHubsResult: PropTypes.object,
    showSignIn: PropTypes.bool,
    signInDestination: PropTypes.string,
    signInReason: PropTypes.string
  };

  state = {
    dialog: null,
    signedIn: null,
    mailingListEmail: "",
    mailingListPrivacy: false
  };

  constructor(props) {
    super(props);
    this.state.signedIn = props.authChannel.signedIn;
    this.state.email = props.authChannel.email;
  }

  componentDidMount() {
    if (this.props.authVerify) {
      this.showAuthDialog(true);
      this.verifyAuth().then(this.showAuthDialog);
      return;
    }
    if (this.props.showSignIn) {
      this.showSignInDialog(false);
    }
    this.loadHomeVideo();
    if (this.props.listSignup) {
      this.showUpdatesDialog();
    } else if (this.props.report) {
      this.showReportDialog();
    }
  }

  async verifyAuth() {
    const authChannel = new AuthChannel(this.props.store);
    authChannel.setSocket(await connectToReticulum());
    await authChannel.verifyAuthentication(this.props.authTopic, this.props.authToken, this.props.authPayload);
    this.setState({ signedIn: true, email: this.props.store.state.credentials.email });
  }

  showDialog = (DialogClass, props = {}) => {
    this.setState({
      dialog: <DialogClass {...{ onClose: this.closeDialog, ...props }} />
    });
  };

  showAuthDialog = verifying => {
    this.showDialog(AuthDialog, { verifying, authOrigin: this.props.authOrigin });
  };

  loadHomeVideo = () => {
    const videoEl = document.querySelector("#background-video");
    if (!videoEl) return;
    videoEl.playbackRate = 0.9;
    playVideoWithStopOnBlur(videoEl);
  };

  closeDialog = () => {
    this.setState({ dialog: null });
  };

  showJoinUsDialog = () => this.showDialog(JoinUsDialog);

  showReportDialog = () => this.showDialog(ReportDialog);

  showUpdatesDialog = () =>
    this.showDialog(UpdatesDialog, {
      onSubmittedEmail: () => {
        this.showDialog(
          <DialogContainer>Great! Please check your e-mail to confirm your subscription.</DialogContainer>
        );
      }
    });

  showSignInDialog = (closable = true) => {
    let messageId = "sign-in.prompt";

    if (this.props.signInReason === "admin_no_permission") {
      messageId = "sign-in.admin-no-permission";
    } else if (this.props.signInDestination === "admin") {
      messageId = "sign-in.admin";
    }

    this.showDialog(SignInDialog, {
      message: messages[messageId],
      closable: closable,
      onSignIn: async email => {
        const { authComplete } = await this.props.authChannel.startAuthentication(email);
        this.showDialog(SignInDialog, { authStarted: true });
        await authComplete;
        this.setState({ signedIn: true, email });
        this.closeDialog();

        if (this.props.signInDestination === "admin") {
          document.location = isLocalClient() ? "/admin.html" : "/admin";
        }
      }
    });
  };

  signOut = () => {
    this.props.authChannel.signOut();
    this.setState({ signedIn: false });
  };

  onLinkClicked = trigger => {
    return e => {
      e.preventDefault();
      e.stopPropagation();
      trigger();
    };
  };

  render() {
    const mainContentClassNames = classNames({
      [styles.mainContent]: true,
      [styles.noninteractive]: !!this.state.dialog
    });

    const showFTUEVideo = false;

    return (
      <IntlProvider locale={lang} messages={messages}>
        <div className={styles.home}>
          <div className={mainContentClassNames}>
            <div className={styles.headerContent}>
              <div className={styles.titleAndNav} onClick={() => (document.location = "/")}>
                <div className={styles.links}>
                  <IfFeature name="show_whats_new_link">
                    <a href="/whats-new">
                      <FormattedMessage id="home.whats_new_link" />
                    </a>
                  </IfFeature>
                  <IfFeature name="show_source_link">
                    <a href="https://github.com/mozilla/hubs" rel="noreferrer noopener">
                      <FormattedMessage id="home.source_link" />
                    </a>
                  </IfFeature>
                  <IfFeature name="show_community_link">
                    <a href={configs.link("community", "https://discord.gg/wHmY4nd")} rel="noreferrer noopener">
                      <FormattedMessage id="home.community_link" />
                    </a>
                  </IfFeature>
                  <IfFeature name="enable_spoke">
                    <a href="/spoke" rel="noreferrer noopener">
                      Spoke
                    </a>
                  </IfFeature>
                  {this.props.showAdmin && (
                    <a href="/admin" rel="noreferrer noopener">
                      <i>
                        <FontAwesomeIcon icon={faCog} />
                      </i>
                      &nbsp;
                      <FormattedMessage id="home.admin" />
                    </a>
                  )}
                </div>
              </div>
              <div className={styles.signIn}>
                {this.state.signedIn ? (
                  <div>
                    <span>
                      <FormattedMessage id="sign-in.as" /> {maskEmail(this.state.email)}
                    </span>{" "}
                    <a onClick={this.onLinkClicked(this.signOut)}>
                      <FormattedMessage id="sign-in.out" />
                    </a>
                  </div>
                ) : (
                  <a onClick={this.onLinkClicked(this.showSignInDialog)}>
                    <FormattedMessage id="sign-in.in" />
                  </a>
                )}
              </div>
            </div>
            <div
              className={styles.heroContent}
              style={{ backgroundImage: configs.image("home_background", null, true) }}
            >
              {!this.props.hideHero &&
                (this.props.favoriteHubsResult &&
                this.props.favoriteHubsResult.entries &&
                this.props.favoriteHubsResult.entries.length > 0 &&
                this.state.signedIn
                  ? this.renderFavoriteHero()
                  : this.renderNonFavoriteHero())}
              {!this.props.hideHero && (
                <div className={classNames(styles.heroPanel, styles.rightPanel)}>
                  {showFTUEVideo && (
                    <div className={styles.heroVideo}>
                      <video playsInline muted loop autoPlay>
                        <source src={homeVideoWebM} type="video/webm" />
                        <source src={homeVideoMp4} type="video/mp4" />
                      </video>
                    </div>
                  )}
                  <div>
                    <div className={styles.secondaryLink}>
                      <a href="/link">
                        <FormattedMessage id="home.have_code" />
                      </a>
                    </div>

                    <IfFeature name="show_discord_bot_link">
                      <div className={styles.secondaryLink}>
                        <div>
                          <FormattedMessage id="home.add_to_discord_1" />
                        </div>
                        <img src={discordLogoSmall} />
                        <a href="/discord">
                          <FormattedMessage id="home.add_to_discord_2" />
                        </a>
                        <div>
                          <FormattedMessage id="home.add_to_discord_3" />
                        </div>
                      </div>
                    </IfFeature>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.footerContent}>
              <div className={styles.links}>
                <div className={styles.top}>
                  <IfFeature name="show_join_us_dialog">
                    <a
                      className={styles.link}
                      rel="noopener noreferrer"
                      href="#"
                      onClick={this.onLinkClicked(this.showJoinUsDialog)}
                    >
                      <FormattedMessage id="home.join_us" />
                    </a>
                  </IfFeature>
                  <IfFeature name="show_newsletter_dialog">
                    <a
                      className={styles.link}
                      rel="noopener noreferrer"
                      href="#"
                      onClick={this.onLinkClicked(this.showUpdatesDialog)}
                    >
                      <FormattedMessage id="home.get_updates" />
                    </a>
                  </IfFeature>
                  <IfFeature name="show_issue_report_link">
                    {configs.feature("show_issue_report_dialog") ? (
                      <a
                        className={styles.link}
                        rel="noopener noreferrer"
                        href="#"
                        onClick={this.onLinkClicked(this.showReportDialog)}
                      >
                        <FormattedMessage id="home.report_issue" />
                      </a>
                    ) : (
                      <a
                        className={styles.link}
                        href={configs.link("issue_report", "/?report")}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <FormattedMessage id="settings.report" />
                      </a>
                    )}
                  </IfFeature>
                  <IfFeature name="show_terms">
                    <a
                      className={styles.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={configs.link("terms_of_use", "https://github.com/mozilla/hubs/blob/master/TERMS.md")}
                    >
                      <FormattedMessage id="home.terms_of_use" />
                    </a>
                  </IfFeature>
                  <IfFeature name="show_privacy">
                    <a
                      className={styles.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={configs.link("privacy_notice", "https://github.com/mozilla/hubs/blob/master/PRIVACY.md")}
                    >
                      <FormattedMessage id="home.privacy_notice" />
                    </a>
                  </IfFeature>
                  <IfFeature name="show_company_logo">
                    <img className={styles.mozLogo} src={configs.image("company_logo", mozLogo)} />
                  </IfFeature>
                </div>
              </div>
            </div>
          </div>
          {this.state.dialog}
        </div>
      </IntlProvider>
    );
  }

  renderPwaButton() {
    return (
      <button
        className={classNames(styles.secondaryButton)}
        style={this.props.installEvent || this.state.installed ? {} : { visibility: "hidden" }}
        onClick={() => {
          this.props.installEvent.prompt();

          this.props.installEvent.userChoice.then(choiceResult => {
            if (choiceResult.outcome === "accepted") {
              this.setState({ installed: true });
            }
          });
        }}
      >
        <i>
          <FontAwesomeIcon icon={faPlus} />
        </i>
        <FormattedMessage id={`home.${isMobile ? "mobile" : "desktop"}.add_pwa`} />
      </button>
    );
  }

  renderCreateButton() {
    return (
      <button
        className={classNames(styles.primaryButton, styles.ctaButton)}
        onClick={e => {
          e.preventDefault();
          createAndRedirectToNewHub(null, null, false);
        }}
      >
        <FormattedMessage id="home.create_a_room" />
      </button>
    );
  }

  renderFavoriteHero() {
    return [
      <div className={styles.heroPanel} key={1}>
        <div className={styles.container}>
          <div className={styles.logoContainer}>
            <div className={classNames([styles.logo, styles.logoMargin])}>
              <img src={configs.image("logo", hubLogo)} />
            </div>
            <div className={classNames([styles.logo, styles.logoMargin])}>
              <img src={configs.image("bp_logo", bpLogo)} />
            </div>
          </div>
        </div>
        <div className={styles.ctaButtons}>
          {this.renderCreateButton()}
          {this.renderPwaButton()}
        </div>
      </div>,
      <div className={styles.heroPanel} key={2}>
        <div className={classNames([mediaBrowserStyles.mediaBrowser, mediaBrowserStyles.mediaBrowserInline])}>
          <div className={classNames([mediaBrowserStyles.box, mediaBrowserStyles.darkened])}>
            <MediaTiles result={this.props.favoriteHubsResult} urlSource="favorites" />
          </div>
        </div>
      </div>
    ];
  }

  renderNonFavoriteHero() {
    return (
      <div className={styles.heroPanel}>
        <div className={styles.container}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <img src={configs.image("logo", hubLogo)} />
            </div>
            <div className={styles.logo}>
              <img src={configs.image("bp_logo", bpLogo)} />
            </div>
          </div>
          <div className={styles.blurb}>
            <FormattedMessage id="app-description" />
          </div>
        </div>
        <div className={styles.ctaButtons}>
          {this.renderCreateButton()}
          {this.renderPwaButton()}
        </div>
      </div>
    );
  }
}

export default HomeRoot;
