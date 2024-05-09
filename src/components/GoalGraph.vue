<script setup>
import {Bar} from "vue-chartjs";
import {onMounted, ref} from "vue";
import {BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip} from "chart.js";
import {ClickUpType} from "@/model/ClickUpModels";
import clickupService from "@/clickup-service";
import {StatusPartialFail} from "@vicons/carbon";
import {NIcon} from "naive-ui";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Props
const props = defineProps({
  goal: Object,
  start_date: Date,
  end_date: Date,
})

// Refs
let loading = ref(false);
let failed = ref(false)

// Goals chart data
const goalChartData = ref({datasets: []})

// Goals chart options
let goalsChartOptions = ref({
  responsive: true,
  maintainAspectRatio: true,
  scales: {
    y: {
      max: props.goal.goal,
      min: 0
    }
  },
  plugins: {
    legend: {
      display: false
    },
  }
})

// Goals chart style
let goalsChartStyles = ref({
  position: 'relative',
  height: '200px',
  width: '130px',
})

onMounted( () => {
  if (props.goal === undefined) {
    failed.value = true
  } else {
    loading.value = true
    fillGraphDataSet(props.goal.clickUpId, props.goal.type).then(() => {
      loading.value = false
    }).catch(e => {
      console.error("Failed loading log data:")
      console.error(e)
      failed.value = true
      loading.value = false
    })
  }
})

// TODO: Add item label to chart label

async function fillGraphDataSet(clickUpId, clickUpType){
  let timeTrackingData = await getTimeTrackingData(clickUpId, clickUpType)
  let goalTargetData = await getGoalTargetData(clickUpId, clickUpType)

  if (timeTrackingData === undefined || goalTargetData === undefined){
    throw "Data from ClickUp is undefined"
  }

  let totalTime = 0

  let goalName = []
  let data = []
  let colors = []

  timeTrackingData.forEach(entry => {
    totalTime += entry.duration / 3600000
  })

  goalName.push(goalTargetData.name)
  data.push(totalTime)
  colors.push(goalTargetData.color)

  goalChartData.value = {
    labels: goalName,
    datasets: [{
      data: data,
      backgroundColor: colors,
    }]
  }
}

async function getTimeTrackingData(id, type) {
  let timeTrackingData = ''

  switch (type) {
    case ClickUpType.SPACE:
      timeTrackingData = await clickupService.getTimeTrackingRange(props.start_date, props.end_date, "", id)
      break
    case ClickUpType.FOLDER:
      timeTrackingData = await clickupService.getTimeTrackingRange(props.start_date, props.end_date, "", "", id)
      break
    case ClickUpType.LIST:
      timeTrackingData = await clickupService.getTimeTrackingRange(props.start_date, props.end_date, "", "", "", id)
      break
    case ClickUpType.TASK:
      timeTrackingData = await clickupService.getTimeTrackingRange(props.start_date, props.end_date, "", "", "", "", id)
      break
    case ClickUpType.SUBTASK:
      timeTrackingData = await clickupService.getTimeTrackingRange(props.start_date, props.end_date, "", "", "", "", id)
      break
  }
  return timeTrackingData
}

async function getGoalTargetData(id, type) {
  let goalTargetData = ''

  switch (type) {
    case ClickUpType.SPACE:
      goalTargetData = await clickupService.getSpace(id)
      break
    case ClickUpType.FOLDER:
      goalTargetData = await clickupService.getFolder(id)
      break
    case ClickUpType.LIST:
      goalTargetData = await clickupService.getList(id)
      break
    case ClickUpType.TASK:
      goalTargetData = await clickupService.getTask(id)
      break
    case ClickUpType.SUBTASK:
      goalTargetData = await clickupService.getTask(id)
      break
  }

  return goalTargetData
}

</script>

<template>
  <div v-if="loading && !failed" class="goalBar empty">
    <img class="animate-pulse w-20 " src="@/assets/images/wave.gif" alt="Wave animation">
  </div>
  <div v-if="failed" class="goalBar empty">
    <n-icon color="#FF0000" size="45">
      <StatusPartialFail/>
    </n-icon>
  </div>
  <div v-if="!loading && !failed" class="goalBar">
    <Bar :data="goalChartData" :options="goalsChartOptions" :style="goalsChartStyles"/>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
  min-width: 140px;
}

.goalBar {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding-right: 10px;
}
</style>