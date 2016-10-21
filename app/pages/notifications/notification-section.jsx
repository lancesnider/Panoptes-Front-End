import React from 'react';
import Notification from './notification';
import apiClient from 'panoptes-client/lib/api-client';
import talkClient from 'panoptes-client/lib/talk-client';
import { Link } from 'react-router';
import Paginator from '../../talk/lib/paginator';

const NotificationSection = React.createClass({

  propTypes: {
    location: React.PropTypes.object,
    notifications: React.PropTypes.array,
    params: React.PropTypes.object,
    project: React.PropTypes.object,
    projectID: React.PropTypes.string,
    section: React.PropTypes.string,
    singleProject: React.PropTypes.bool,
    slug: React.PropTypes.string,
    user: React.PropTypes.object,
  },

  contextTypes: {
    notificationsCounter: React.PropTypes.object,
  },

  getDefaultProps() {
    return {
      location: { query: { page: 1 } },
      section: null,
      singleProject: false,
    };
  },

  getInitialState() {
    return {
      expanded: false,
      firstMeta: { },
      lastMeta: { },
      notificationsMap: { },
    };
  },

  componentWillMount() {
    if (this.props.user) this.getNotifications();
    if (this.props.section === 'zooniverse') {
      this.setState({
        name: 'Zooniverse',
      });
    } else {
      return apiClient.type('projects').get({ id: this.props.projectID, cards: true })
      .catch(() => {
        return null;
      })
      .then(([project]) => {
        this.setState({
          name: project.display_name,
          avatar: project.avatar_src,
        });
      });
    }
  },

  componentDidMount() {
    if (this.props.singleProject) this.setState({ expanded: true })
    this.getUnreadCount();
  },

  componentWillReceiveProps(nextProps) {
    const pageChanged = nextProps.location.query.page !== this.props.location.query.page;
    const userChanged = nextProps.user && nextProps.user !== this.props.user;
    if (pageChanged || userChanged) {
      this.getNotifications(nextProps.location.query.page);
    }
  },

  componentWillUnmount() {
    if (this.props.user) {
      // this.markAsRead('first')()
      // this.markAsRead('last')()
    }
  },

  getNotifications(page) {
    let firstMeta;
    let lastMeta;
    this.getUnreadCount();
    return talkClient.type('notifications').get(this.notificationsQuery(page))
      .then((newNotifications) => {
        const meta = newNotifications[0].getMeta() || { };
        const notifications = this.state.notifications || newNotifications;
        const notificationsMap = this.state.notificationsMap;

        for (const notification in newNotifications) {
          notificationsMap[notification.id] = notification;
        }

        if (meta.page > this.state.lastMeta.page) {
          lastMeta = meta;
          notifications.push.apply(notifications, newNotifications);
        } else if (meta.page < this.state.firstMeta.page) {
          firstMeta = meta;
          notifications.unshift.apply(notifications, newNotifications);
        } else {
          firstMeta = lastMeta = meta;
        }

        this.setState({
          notifications: notifications,
          notificationsMap: notificationsMap,
          firstMeta: firstMeta,
          lastMeta: lastMeta,
        });
      });
  },

  getUnreadCount() {
    return talkClient.type('notifications').get({page: 1, page_size: 1, delivered: false, section: this.props.section })
    .catch(() => {
      return null;
    })
    .then(([project]) => {
      if (project) {
        const count = project.getMeta().count || 0;
        this.setState({ unread: count });
      } else {
        this.setState({ unread: 0 });
      }
    });
  },

  markAsRead(position) {
    const ids = this.state[position + 'Meta'].notificationIds
    // const ids = (id for id in ids when not @state.notificationsMap[id].delivered)
    // return if ids.length is 0
    // talkClient.put '/notifications/read', id: ids.join(',')
    // for notification in @state.notifications when notification.id in ids
    //   notification.update delivered: true
  },

  notificationsQuery(page = this.props.location.query.page, options = { }) {
    const query = Object.assign({}, options, {
      page: page,
      page_size: 5,
    });
    if (this.props.project) {
      query.section = 'project-' + this.props.project.id;
    }
    if (this.props.section) {
      query.section = this.props.section;
    }
    return query
  },

  avatarFor() {
    const src = this.state.avatar ? '//' + this.state.avatar : '/assets/simple-avatar.jpg';
    if (this.state.unread > 0) {
      return this.unreadCircle();
    } else {
      return <img src={src} className="notification-section__img" alt="Project Avatar" />;
    }
  },

  unreadCircle() {
    return (
      <svg className="notification-section__img" xmlns="http://www.w3.org/2000/svg">
        <circle cx="0" cy="0" r="100" fill="#E45950">
          <title>
            {(this.state.unread + ' Unread Notification(s)')}
          </title>
        </circle>
        <text x="40%" y="50%" stroke="white" strokeWidth="2px" dy=".3em">{this.state.unread}</text>
      </svg>
    );
  },

  onDivChanged() {
    const id = this.props.projectID;
    this.props.callbackParent(id)
  },

  renderHeader() {
    const sectionTitle = this.props.projectID.length ? this.props.section : 'project-zooniverse';
    const buttonType = this.props.expanded ? 'fa fa-times fa-lg' : 'fa fa-chevron-down fa-lg';
    const expandToggle = this.props.expanded ? false : this.props.projectID
    console.log(expandToggle);

    return (
      <div>

        <div className="notification-section__header">
          <div className="notification-section__item">
            {this.avatarFor()}
          </div>

          <div className="notification-section__item">
            <Link to={'/projects/' + this.state.slug} className="notification-section__title">
              <h3 className="notification-section__title">{this.state.name}</h3>
            </Link>
          </div>

          <div className="notification-section__item">
            <button
              className="secret-button notification-section__toggle"
              title="Remove choice"
              onClick={this.props.callbackParent.bind(null, expandToggle)}
            >
              <i className={buttonType}></i>
            </button>
          </div>
        </div>
      </div>
    );
  },

  render() {
    return (
      <div className="notification-section">

        {this.renderHeader()}

        {this.props.expanded && (
          this.state.notifications.map((notification) => {
            return (
              <Notification
                notification={notification}
                key={notification.id}
                user={this.props.user}
                project={this.props.project}
                params={this.props.params}
              />);
          })
        )}

        {this.state.expanded && (
          <div className="centering">
            <Paginator
              className="older"
              scrollOnChange={false}
              firstAndLast={false}
              pageSelector={false}
              nextLabel={<span>Load more <i className="fa fa-long-arrow-down" /></span>}
            />
          </div>
        )}

      </div>
    );
  },
});

export default NotificationSection;
