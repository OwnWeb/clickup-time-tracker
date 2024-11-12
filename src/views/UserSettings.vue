<template>
  <!-- START | Drag handle -->
  <div class="h-6 bg-gray-200 dark:bg-gray-700" style="-webkit-app-region: drag"></div>
  <!-- END | Drag handle -->

  <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
    <n-form ref="form" :model="model" :rules="rules" size="large">
      <n-form-item label="ClickUp Access token" path="clickup_access_token" placeholder="pk_">
        <n-input v-model:value="model.clickup_access_token" clearable class="dark:bg-gray-800 dark:text-gray-200" />
      </n-form-item>

      <n-form-item label="ClickUp Team ID" path="clickup_team_id">
        <n-input v-model:value="model.clickup_team_id" clearable class="dark:bg-gray-800 dark:text-gray-200" />
      </n-form-item>
      <div class="flex space-x-4">
        <n-form-item label="Day starts at" path="day_start" class="flex-grow">
          <n-select
              v-model:value="model.day_start"
              :options="hours"
              class="dark:bg-gray-800 dark:text-gray-200"
          >
            <template #arrow>
              <ClockIcon class="w-4 dark:text-gray-300" />
            </template>
          </n-select>
        </n-form-item>

        <n-form-item label="Day ends at" path="day_end" class="flex-grow">
          <n-select
              v-model:value="model.day_end"
              :options="hours"
              class="dark:bg-gray-800 dark:text-gray-200"
          >
            <template #arrow>
              <ClockIcon class="w-4 dark:text-gray-300" />
            </template>
          </n-select>
        </n-form-item>
      </div>

      <!-- START | Feature toggles -->
      <div class="relative p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm">
        <label class="absolute px-1.5 bg-white dark:bg-gray-800 -left-0.5 -top-3">Optional features</label>

        <n-form-item :show-feedback="false" :show-label="false" path="show_weekend">
          <n-switch v-model:value="model.show_weekend" :default-value="true" />
          <label class="ml-3 text-gray-800 dark:text-gray-200">Show weekends</label>
        </n-form-item>

        <n-form-item :show-feedback="false" :show-label="false" path="require_description">
          <n-switch v-model:value="model.require_description" :default-value="false" />
          <label class="ml-3 text-gray-800 dark:text-gray-200">Require descriptions</label>
        </n-form-item>

        <n-form-item :show-feedback="false" :show-label="false" path="admin_features_enabled">
          <n-switch v-model:value="model.admin_features_enabled" :default-value="false" />
          <label class="ml-3 text-gray-800 dark:text-gray-200">
            Enable admin features
            <div class="text-sm text-gray-500 dark:text-gray-400">You must be a CU admin to use this</div>
          </label>
        </n-form-item>

        <n-form-item :show-feedback="false" :show-label="false" path="enable_statistics">
          <n-switch v-model:value="model.enable_statistics" :default-value="false" />
          <label class="ml-3 text-gray-800 dark:text-gray-200">Enable statistics</label>
        </n-form-item>
        <hr class="my-6 dark:border-gray-700" />
        <!-- END | Feature toggles -->

        <!-- START | Styling -->
        <label class="absolute px-1.5 bg-white dark:bg-gray-800 -ml-4 -mt-9">Style</label>

        <n-form-item label="Background image url (optional)" path="background_image_url">
          <n-input v-model:value="model.background_image_url" clearable class="dark:bg-gray-800 dark:text-gray-200" />
        </n-form-item>

        <label class="text-gray-800 dark:text-gray-200">Color of tracking entries</label>
        <div class="grid grid-cols-2 gap-4 w-full">
          <n-form-item :show-feedback="false" :show-label="false" path="custom_color_enabled">
            <n-switch v-model:value="model.custom_color_enabled" @update:value="setDefaultColor" />
            <label class="ml-3 text-gray-800 dark:text-gray-200">Enable custom color</label>
          </n-form-item>

          <n-form-item :show-label="false" :show-feedback="false" class="w-full" path="color">
            <n-color-picker
                v-model:value="model.color"
                :disabled="!(model.custom_color_enabled)"
                :modes="['hex']"
                class="w-full"
            />
          </n-form-item>
        </div>

        <hr class="my-6 dark:border-gray-700" />
        <!-- END | Styling -->

        <!-- START | Goals -->
        <label class="absolute px-1.5 bg-white dark:bg-gray-800 -ml-4 -mt-9">Goals</label>
        <n-form-item :show-label="false" :show-feedback="false" path="goals">
          <n-dynamic-input
              v-model:value="model.goals"
              :on-create="onAddGoal"
              :disabled="!model.enable_statistics"
              :min="0"
              :max="4"
          >
            <template #create-button-default>
              Add a goal
            </template>
            <template #default="{value}">
              <div style="display: flex; align-items: center; width: 100%">
                <n-select
                    v-model:value="value.type"
                    :options="clickUpTypeOptions"
                    :render-label="renderDropDownIcon"
                    class="mr-2.5 dark:bg-gray-800 dark:text-gray-200"
                    style="width: 200px"
                    placeholder="Type"
                />
                <n-input
                    v-model:value="value.clickUpId"
                    placeholder="ClickUp Id"
                    type="text"
                    class="mr-2.5 dark:bg-gray-800 dark:text-gray-200"
                />
                <n-input-number
                    v-model:value="value.goal"
                    :min="0"
                    :max="168"
                    style="width: 175px"
                />
              </div>
            </template>
          </n-dynamic-input>
        </n-form-item>
        <hr class="my-6 dark:border-gray-700" />
        <!-- END | Goals -->

        <!-- START | Danger zone -->
        <label class="absolute px-1.5 bg-white dark:bg-gray-800 -ml-4 -mt-9">Danger zone</label>
        <n-popconfirm :show-icon="false" @positive-click="flushCaches">
          <template #activator>
            <n-button secondary size="small" type="warning" class="bg-yellow-500 dark:bg-yellow-700">
              Flush caches
            </n-button>
          </template>
          This will clear all locally cached<br />
          ClickUp tasks & team members
        </n-popconfirm>
        <!-- END | Danger zone -->
      </div>

      <div class="flex justify-end mt-4 space-x-2">
        <n-button round @click="cancel" class="bg-gray-200 dark:bg-gray-700 dark:text-gray-200">
          Cancel
        </n-button>
        <n-button round type="primary" @click="persist" class="bg-blue-600 dark:bg-blue-800">
          Save
        </n-button>
      </div>
    </n-form>

    <div class="flex flex-col p-3 space-y-4 shadow-inner bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <h2 class="text-xl font-bold text-gray-700 dark:text-gray-200">Instructions</h2>
      <p>Click & drag in order to create a new tracking entry</p>

      <h3 class="text-lg font-bold text-gray-700 dark:text-gray-200">Styling</h3>
      <p>It is possible to give all tracking entries the same color...</p>

      <h3 class="text-lg font-bold text-gray-700 dark:text-gray-200">Goals</h3>
      <p>When statistics are enabled...</p>

      <h2 class="text-lg font-bold text-gray-700 dark:text-gray-200">Keybindings</h2>

      <div class="flex">
        <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded">
          ⌘ + D
        </kbd>
        Duplicate the selected entry
      </div>
      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded dark:text-gray-300 dark:border-gray-600">
          ⌘ +
          <backspace-icon class="w-4 ml-1 dark:text-gray-300"/>
        </kbd>
        <span class="text-gray-800 dark:text-gray-200">Delete the selected entry</span>
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded dark:text-gray-300 dark:border-gray-600">
          ⌘ + X
        </kbd>
        <span class="text-gray-800 dark:text-gray-200">Refresh background image cache</span>
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded dark:text-gray-300 dark:border-gray-600">
          ⌘ + R
        </kbd>
        <span class="text-gray-800 dark:text-gray-200">Refresh the current screen (for troubleshooting)</span>
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded dark:text-gray-300 dark:border-gray-600">
          ⌘ + V
        </kbd>
        <span class="text-gray-800 dark:text-gray-200">alias for</span>
        <kbd
            class="inline-flex items-center px-2 ml-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded dark:text-gray-300 dark:border-gray-600">
          ⌘ + D
        </kbd>
      </div>
    </div>
  </div>
</template>

<script>
import {h, ref} from "vue";
import {useRouter} from "vue-router";
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSwitch,
  NButton,
  NPopconfirm,
  NColorPicker,
  useNotification,
  NDynamicInput,
  NInputNumber,
  NIcon
} from "naive-ui";
import {BackspaceIcon, ClockIcon} from "@heroicons/vue/24/outline";
import clickupService from '@/clickup-service';
import store from "@/store";
import cache from "@/cache";
import {ClickUpType} from "@/model/ClickUpModels";

import {Planet, List, Folder} from '@vicons/ionicons5'
import {CircleFilled} from "@vicons/carbon";

export default {
  components: {
    NForm,
    NFormItem,
    NInput,
    NSelect,
    NSwitch,
    NButton,
    NPopconfirm,
    BackspaceIcon,
    ClockIcon,
    NColorPicker,
    NDynamicInput,
    NInputNumber,
  },

  setup() {
    const form = ref(null);
    const router = useRouter();
    const notification = useNotification();
    const model = ref(store.get("settings") || {});
    const hours = ref(Array.from(Array(25).keys()).map((i) => ({label: `${i}:00`, value: i})));
    let custom_color = ref(false);

    const clickUpTypeOptions = [
      {
        label: 'Space',
        value: ClickUpType.SPACE,
        icon: Planet,
      },
      {
        label: 'Folder',
        value: ClickUpType.FOLDER,
        icon: Folder,
      },
      {
        label: 'List',
        value: ClickUpType.LIST,
        icon: List,
      },
      {
        label: 'Task',
        value: ClickUpType.TASK,
        icon: CircleFilled,
      },
    ];

    function mustFlushCachesAfterPersist() {
      // Either the CU acces token or team id has changed
      return model.value.clickup_access_token !== store.get('settings.clickup_access_token')
          || model.value.clickup_team_id !== store.get('settings.clickup_team_id')
    }

    return {
      form,
      model,
      hours,
      custom_color,
      clickUpTypeOptions,
      renderDropDownIcon: (option) => {
        return [
          h('div', { style: 'display: flex; align-items: center;' }, [
            h(NIcon, {size: '15px', id: 'cascader-icon'}, {default: () => h(option.icon)}),
            h('span', { style: 'margin-left: 8px;'}, option.label)
          ])
        ]
      },

      persist() {
        form.value
            .validate()
            .then(() => {

              if (mustFlushCachesAfterPersist()) {
                cache.flush();
              }

              store.set({settings: model.value});

              router.replace({name: "time-tracker"});

              notification.success({title: "Settings saved!", duration: 1500});
            })
            .catch((errors) => console.error(errors));
      },

      cancel() {
        router.replace({name: "time-tracker"});
      },

      flushCaches() {
        cache.flush()

        notification.success({title: "All caches flushed!", duration: 1500});
      },

      setDefaultColor(event) {
        if (!event) {
          model.value.color = "#ADD8E67F";
        }
      },

      onAddGoal() {
        return {
          type: undefined,
          clickUpId: undefined,
          goal: 0
        }
      },


      rules: {
        clickup_access_token: [
          {
            required: true,
            min: 43,
            message: "Please input your ClickUp Access Token",
            trigger: ["input", "blur"],
          },
          {
            required: true,
            validator: (rule, value) => clickupService.tokenValid(value),
            message: "This token couldn't be validated with ClickUp. Please verify.",
            trigger: ['blur']
          }
        ],
        clickup_team_id: [
          {
            required: true,
            min: 1,
            message: "Please input your ClickUp Team ID",
            trigger: ["input", "blur"],
          },
          // TODO: Add async validity checker
        ],
        day_start: [
          {
            required: true,
            validator(rule, value) {
              if (Number(value) >= Number(model.value.day_end)) {
                return new Error("Must be less than the end of day");
              }
              return true;
            },
            trigger: ["input", "blur"],
          },
        ],
        day_end: [
          {
            required: true,
            validator(rule, value) {
              if (Number(value) <= Number(model.value.day_start)) {
                return new Error("Must be more than the start of day");
              }
              return true;
            },
            trigger: ["input", "blur"],
          },
        ]
      },
    };
  },
};
</script>
