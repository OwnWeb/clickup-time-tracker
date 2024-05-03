import request from 'request';
import store from '@/store';
import cache from '@/cache';
import {ClickUpItemFactory} from "@/model/ClickUpModels";

const BASE_URL = 'https://api.clickup.com/api/v2';

// Cache keys
const HIERARCHY_CACHE_KEY = 'hierarchy';
const USERS_CACHE_KEY = 'users';

// Factory
// The factory is used to create the correct model objects from the API response.
// But, sometimes you don't want to create a model object, but just the api dump. So maybe an idea for future
// refactoring, would to turn the factory optioinal based on a parameter. But for now, this works.
const factory = new ClickUpItemFactory();

function teamRootUrl() {
    return `${BASE_URL}/team/${store.get('settings.clickup_team_id')}`
}

export default {

    /*
     * Checks if the given token is valid by making a request to the user endpoint.
     */
    tokenValid(token) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: BASE_URL + '/user',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                const user = JSON.parse(response.body).user

                if (!user) reject('Invalid response')

                resolve(true)
            });
        })
    },

    /*
     * Builds a hierarchy of spaces, folders, lists, tasks and subtasks, from a team.
     * Can be used to display the treeview options.
     */
    async getHierarchy() {
        const spaces = await this.getSpaces().catch(e => {
            console.error(e)
        })
        try {
            if (spaces.length > 0) {
                await Promise.all(spaces.map(async (space) => {
                    console.log("Building hierarchy for:")
                    console.log(space.name)
                    const folders = await this.getFolders(space.id).catch(e => {
                        console.error(e)
                    })
                    if (folders.length > 0) {
                        console.log("Folders for space: " + space.name)
                        console.log(folders)
                        await Promise.all(folders.map(async (folder) => {
                            const folderdlLists = await this.getFolderedLists(folder.id).catch(e => {
                                console.error(e)
                            })
                            if (folderdlLists.length > 0) {
                                console.log("Lists for folder " + folder.name)
                                console.log(folderdlLists)
                                await Promise.all(folderdlLists.map(async (folderdlList) => {
                                    const tasks = await this.getTasksFromList(folderdlList.id).catch(e => {
                                        console.error(e)
                                    })
                                    folderdlList.addChildren(tasks)
                                })).catch(e => {
                                    console.error(e)
                                })
                                folder.addChildren(folderdlLists)
                            }
                        })).catch(e => {
                            console.error(e)
                        })
                        space.addChildren(folders)
                    }

                    const lists = await this.getLists(space.id).catch(e => {
                        console.error(e)
                    })
                    if (lists.length > 0) {
                        await Promise.all(lists.map(async (list) => {
                            const tasks = await this.getTasksFromList(list.id).catch(e => {
                                console.error(e)
                            })
                            if (tasks.length > 0) {
                                list.addChildren(tasks);
                            }
                        })).catch(e => {
                            console.error(e)
                        })
                        space.addChildren(lists)
                    }
                })).catch(e => {
                    console.error(e)
                })
                return spaces
            }
        } catch (e) {
            console.error(e)
        }
    },

    async getCachedHierarchy() {
        try {
            const cached = cache.get(HIERARCHY_CACHE_KEY)

            if (cached) {
                console.log("Got hierarchy from cache")
                return cached
            }

            let hierarchy = await this.getHierarchy().catch(e => {
                console.error(e)
            })
            return cache.put(
                HIERARCHY_CACHE_KEY,
                hierarchy,
                3600 * 6 // plus 6 hours
            )
        } catch (e) {
            console.error(e)
        }
    },

    clearCachedHierarchy() {
        cache.clear(HIERARCHY_CACHE_KEY)
    },

    /*
    * Get a single space from a team, by id (for now unused)
     */
    // TODO: ClickUp API has a path for getting a single space, but it doesn't work, always returns invalid id, so we
    //  have to get all spaces and filter them. This is not ideal, but it works. Luckily, there(usually) are not that many
    async getSpace(spaceId) {
        let spaces = await this.getSpaces()
            .then(spaces => {
                return spaces.filter(space => space.id === spaceId)
            }).catch(e => {
                console.error(e)
            })
        return spaces[0]
    },

    /*
    * Get all spaces from a team
     */
    async getSpaces() {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/team/${store.get('settings.clickup_team_id')}/space?archived=false'`,

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).spaces || [])
            });
        }).then(spaces => {
            spaces = spaces.map(space => factory.createSpace(space))
            // console.log("Spaces received from ClickUp: ")
            // console.log(spaces)
            return spaces
        }).catch(e => {
            console.error(e)
        })
    },

    /*
    * Get all folders from a space
    */
    async getFolders(spaceId) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                url: `${BASE_URL}/space/${spaceId}/folder?archived=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).folders || [])
            });
        }).then(folders => {
            folders = folders.map(folder => factory.createFolder(folder))
            // console.log("Folders received from ClickUp")
            // console.log(folders)
            return folders
        }).catch(e => {
            console.error(e)
        })
    },

    /*
    * Get all lists from a folder
    */
    async getFolderedLists(FolderId) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                url: `${BASE_URL}/folder/${FolderId}/list?archived=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).lists || [])
            });
        }).then(lists => {
            lists = lists.map(list => factory.createList(list))
            return lists
        }).catch(e => {
            console.error(e)
        })
    },

    /*
    * Get all lists from a space that are not in a folder
     */
    async getLists(spaceId) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/space/${spaceId}/list?archived=false`,

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).lists || [])
            });
        }).then(lists => {
            lists = lists.map(list => factory.createList(list))
            return lists
        }).catch(e => {
            console.error(e)
        })
    },

    /*
    * Get all tasks from a list
     */
    async getTasksFromList(listId) {

        let results = await new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/list/${listId}/task?archived=false&include_markdown_description=false&subtasks=true&include_closed=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).tasks || [])
            });
        }).catch(e => {
            console.error(e)
        })

        // Link subtasks to their parent
        // It would be nice if the API would do this for us, but it doesn't. Nested list? Something? Anything?
        // Maybe it could be done faster. I would like to see it, if someone can do it better. out of curiosity.
        let tasks = []
        let loop_counter = 0
        //console.log(results)
        while (results.length > 0 && loop_counter < 1000) {
            loop_counter = loop_counter + 1
            let task = results.pop()
            if (task.parent != null) {
                let addChildInChildren = function (children, task) {
                    if (children) {
                        if (children.some(child => child.id == task.parent)) {
                            children.find(child => child.id == task.parent).addChild(factory.createSubtask(task))
                            children.sort(function (a, b) {
                                let textA = a.name.toUpperCase();
                                let textB = b.name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                            return true
                        } else {
                            return children.some(child => addChildInChildren(child.children, task))
                        }
                    } else {
                        return false
                    }
                }
                if (addChildInChildren(tasks, task) === false) {
                    results.unshift(task)
                }
            } else if (task.parent == null) {
                tasks.push(factory.createTask(task))
            } else {
                results.unshift(task)
            }

        }

        if (loop_counter >= 1000) {
            console.log(`Some parents tasks where not found fetching the task for list ${listId}`)
            console.log('List of orphaned tasks:')
            console.log(results)
        }

        tasks.sort(function (a, b) {
            let textA = a.name.toUpperCase();
            let textB = b.name.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });


        return tasks
    },

    async getTask(taskId) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/task/${taskId}?include_subtasks=false&include_markdown_description=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body) || [])
            });
        }).then(task => {
            task = factory.createTask(task)
            return task
        }).catch(e => {
            console.error(e)
        })
    },

    async getColorsBySpace() {
        return this.getSpaces().then(spaces => {
            // console.log("Spaces for color pallete:")
            // console.log(spaces)
            let colors = new Map()
            if (spaces) {
                spaces.forEach(space => {
                    colors.set(space.id, space.color)
                })
            }
            return colors
        }).catch(e => {
            console.error(e)
        })
    },

    async getSpaceIdFromTask(taskId) {
        const task = await this.getTask(taskId).catch(e => {
            console.error(e)
        })
        return task.space.id
    },

    /*
    * Get all time tracking entries within a given range
    */
    async getTimeTrackingRange(start, end, userId) {
        if ((!start && start === undefined) || (!end && end === undefined)) return;
        console.log("Getting time tracking entries for range " + start + " - " + end)

        return new Promise((resolve, reject) => {

            const params = {
                start_date: start.getTime(),
                end_date: end.getTime(),
                include_location_names: true,
            }

            // Only set assignee when argument was given
            if (userId) {
                params.assignee = userId
            }

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${teamRootUrl()}/time_entries?` + new URLSearchParams(params),

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                const body = JSON.parse(response.body)

                if (body.err) { // This friggin api... return a decent response code for fuck sake
                    reject(body.err)
                }
                resolve(body.data || [])
            });
        })
    },

    /*
     * Create a new time tracking entry
     */
    createTimeTrackingEntry(taskId, description, start, end) {
        return new Promise((resolve, reject) => {

            request({
                method: 'POST',
                url: `${teamRootUrl()}/time_entries`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "tid": taskId,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data)
            })
        })
    },

    /*
     * Update an exisiting time tracking entry
     */
    updateTimeTrackingEntry(entryId, description, start, end) {
        return new Promise((resolve, reject) => {

            request({
                method: 'PUT',
                url: `${teamRootUrl()}/time_entries/${entryId}`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    },

    /*
     * Deleta a time tracking entry
     */
    deleteTimeTrackingEntry(entryId) {
        return new Promise((resolve, reject) => {

            request({
                method: 'DELETE',
                url: `${teamRootUrl()}/time_entries/${entryId}`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    },

    /*
     * Fetch all members from all teams you have access to
     */
    getUsers() {
        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                url: `${BASE_URL}/team/`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                const teams = JSON.parse(response.body).teams
                const users = teams
                    .flatMap(team => team.members)
                    .map(member => member.user)
                    .filter(user => user.role !== 4) // Remove guests
                    .filter((user, index, self) => self.indexOf(user) === index) // only unique id's
                    .sort(function (a, b) { // sort alphabetically by name
                        if (a.username === b.username) return 0

                        return a.username < b.username
                            ? -1
                            : 1
                    })

                resolve(users)
            })
        })
    },

    /*
     * Fetch users from cache
     */
    async getCachedUsers() {
        const cached = cache.get(USERS_CACHE_KEY)

        if (cached) {
            return cached
        }

        return cache.put(
            USERS_CACHE_KEY,
            await this.getUsers(),
            3600 * 6 // plus 6 hours
        )
    },

    /*
     * Function to build a dataset for the charts in the statistics view
     */
    async getTimeTrackingData(start, end, userid = null) {
        console.log("Getting time tracking data for range " + start + " - " + end)

        // let data_by_day = new Map()

        this.getTimeTrackingData(start, end, userid).then((data) => {
            console.log(data)
        })
    }
}
