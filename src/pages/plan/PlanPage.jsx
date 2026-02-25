/** Plan Page
 * Displays the optimized schedule (Gantt) and related plan data (charts).
 */
import { useMemo, useState } from "react";
import "@svar-ui/react-gantt/all.css";
import "../../styles/pages/Plan.css";

import { SCALES, buildIdMap } from "./utils/planTransform.js";
import { usePlanData } from "./hooks/usePlanData.js";

import PlanHeader from "./components/PlanHeader.jsx";
import TaskDetailsModal from "./components/TaskDetailsModal.jsx";
import GanttPanel from "./components/GanttPanel.jsx";
import PrognosesCharts from "./components/PrognosesCharts.jsx";
import CompareView from "./components/CompareView.jsx";

function PlanPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // 'total' for total prognoses. Else generator id.
  const [selectedGeneratorId, setSelectedGeneratorId] = useState("total");
  const [compareView, setCompareView] = useState(false);

  const [collapsed, setCollapsed] = useState({
    gantt: false,
    price: false,
    generation: false,
    batteries: false,
    variableActions: false,
    constantActions: false,
  });

  const toggleCollapsed = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  const closeTaskModal = () => {
    setModalOpen(false);
    setSelectedTask(null);
  };

  const {
    tasks,
    planData,
    status,
    error,
    setError,
    refreshAll,
    handleGeneratePlan,
    initGantt,
    ganttStart,
    ganttEnd,
    generatorOptions,
    priceDataFromBackend,
    generatorDataFromBackend,
  } = usePlanData({
    compareView,
    selectedGeneratorId,
    setSelectedGeneratorId,
    onTaskClicked: openTaskModal,
  });

  const batteryById = useMemo(
    () => buildIdMap(planData.batteries, "id"),
    [planData.batteries]
  );

  const variableActionById = useMemo(
    () => buildIdMap(planData.variableActions, "id"),
    [planData.variableActions]
  );

  const selectedId = selectedTask ? String(selectedTask.id) : null;
  const selectedBattery = selectedId ? batteryById.get(selectedId) : null;
  const selectedVA = selectedId ? variableActionById.get(selectedId) : null;

  return (
    <>
      <TaskDetailsModal
        open={modalOpen && !compareView}
        onClose={closeTaskModal}
        selectedTask={selectedTask}
        selectedBattery={selectedBattery}
        selectedVA={selectedVA}
        planData={planData}
      />

      <PlanHeader
        status={status}
        error={error}
        onGenerate={handleGeneratePlan}
        onRefresh={refreshAll}
        compareView={compareView}
        setCompareView={setCompareView}
      />

      {!compareView ? (
        <>
          <GanttPanel
            tasks={tasks}
            scales={SCALES}
            ganttStart={ganttStart}
            ganttEnd={ganttEnd}
            initGantt={initGantt}
            setError={setError}
          />

          <PrognosesCharts
            planData={planData}
            generatorOptions={generatorOptions}
            selectedGeneratorId={selectedGeneratorId}
            setSelectedGeneratorId={setSelectedGeneratorId}
            priceDataFromBackend={priceDataFromBackend}
            generatorDataFromBackend={generatorDataFromBackend}
          />
        </>
      ) : (
        <CompareView
          tasks={tasks}
          planData={planData}
          scales={SCALES}
          ganttStart={ganttStart}
          ganttEnd={ganttEnd}
          initGantt={initGantt}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
          generatorOptions={generatorOptions}
          selectedGeneratorId={selectedGeneratorId}
          setSelectedGeneratorId={setSelectedGeneratorId}
          priceDataFromBackend={priceDataFromBackend}
          generatorDataFromBackend={generatorDataFromBackend}
        />
      )}
    </>
  );
}

export default PlanPage;