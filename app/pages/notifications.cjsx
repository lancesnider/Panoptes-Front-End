React = require 'react'
Loading = require '../components/loading-indicator'
Paginator = require '../talk/lib/paginator'
ChangeListener = require '../components/change-listener'
talkClient = require '../api/talk'
Notification = require './notifications/notification'

module?.exports = React.createClass
  displayName: 'NotificationsPage'

  propTypes:
    project: React.PropTypes.object
    user: React.PropTypes.object

  getDefaultProps: ->
    query: page: 1

  getInitialState: ->
    firstMeta: { }
    lastMeta: { }
    loading: true

  componentWillMount: ->
    @getNotifications() if @props.user

  componentWillUnmount: ->
    @markAsRead('first')()
    @markAsRead('last')()

  componentWillReceiveProps: (nextProps) ->
    pageChanged = nextProps.query.page isnt @props.query.page
    userChanged = nextProps.user and nextProps.user isnt @props.user
    @getNotifications(nextProps.query.page) if pageChanged or userChanged

  getNotifications: (page = @props.query.page) ->
    page or= 1
    query = {page}
    query.section = "project-#{ @props.project.id }" if @props.project
    query.section = @props.params.section if @props.params.section
    talkClient.type('notifications').get(query).then (newNotifications) =>
      meta = newNotifications[0]?.getMeta() or { }
      notifications = @state.notifications or newNotifications
      meta.notificationIds = (n.id for n in newNotifications)

      {firstMeta, lastMeta} = @state

      if meta.page > @state.lastMeta.page
        lastMeta = meta
        notifications.push newNotifications...
      else if meta.page < @state.firstMeta.page
        firstMeta = meta
        notifications.unshift newNotifications...
      else
        firstMeta = lastMeta = meta

      loading = false
      @setState {loading, notifications, firstMeta, lastMeta}

  markAsRead: (meta)->
    =>
      ids = @state["#{ meta }Meta"].notificationIds
      setTimeout =>
        talkClient.put '/notifications/read', id: ids.join(',')
        for notification in @state.notifications when notification.id in ids
          notification.update delivered: true

  render: ->
    <div className="talk notifications">
      <div className="content-container">
        {if @props.user?
          <ChangeListener target={@props.user}>{ =>
            if @state.notifications?.length > 0
              <div>
                {if @state.firstMeta.page > 1
                  <div className="centering">
                    <Paginator
                      className="newer"
                      page={+@state.firstMeta.page}
                      pageCount={@state.firstMeta.page_count}
                      scrollOnChange={false}
                      firstAndLast={false}
                      pageSelector={false}
                      previousLabel={<span>Load newer <i className="fa fa-long-arrow-up" /></span>}
                      onClickPrev={@markAsRead 'first'} />
                  </div>}

                <div className="list">
                  {for notification in @state.notifications
                    <Notification notification={notification} key={notification.id} user={@props.user} />
                  }
                </div>

                <div className="centering">
                  <Paginator
                    className="older"
                    page={+@state.lastMeta.page}
                    pageCount={@state.lastMeta.page_count}
                    scrollOnChange={false}
                    firstAndLast={false}
                    pageSelector={false}
                    nextLabel={<span>Load more <i className="fa fa-long-arrow-down" /></span>}
                    onClickNext={@markAsRead 'last'} />
                </div>
              </div>
            else if @state.notifications?.length is 0
              <div className="centering talk-module">
                <p>You have no notifiations</p>
              </div>
            else
              <Loading />
          }</ChangeListener>
        else
          <div className="centering talk-module">
            <p>You're not signed in.</p>
          </div>}
      </div>
    </div>
