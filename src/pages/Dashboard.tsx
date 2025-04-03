import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getRobots,
  addRobot,
  updateRobot,
  deleteRobot,
} from "../utils/firestoreHelpers";
import { RobotDetailsPane } from "../components/RobotDetailsPane";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import SidebarLayout from "../components/SidebarLayout";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { FiCpu, FiTruck, FiDisc, FiWifi, FiBox } from "react-icons/fi";

interface Robot {
  id?: string;
  name: string;
  type: string;
  status: string;
  battery: number | null;
  description?: string;
  serialNumber?: string;
  connectionProtocol?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [paneOpen, setPaneOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [mode, setMode] = useState<"view" | "create">("create");
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        const robotData = await getRobots(user.uid);
        setRobots(robotData as Robot[]);

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const name = data?.profile?.firstName || null;
          if (name && typeof name === "string") {
            const formatted =
              name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            setUserFirstName(formatted);
          } else {
            setUserFirstName(null);
          }
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getRandomColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "drone":
        return <FiCpu />;
      case "uav":
        return <FiWifi />;
      case "vacuum":
        return <FiDisc />;
      case "arm":
      case "robot arm":
        return <FiBox />;
      default:
        return <FiTruck />;
    }
  };

  const handleCreateClick = () => {
    setSelectedRobot({
      name: "",
      type: "drone",
      status: "idle",
      battery: Math.floor(Math.random() * 100),
    });
    setMode("create");
    setPaneOpen(true);
  };

  const handleSave = async () => {
    if (!user?.uid || !selectedRobot) return;
    if (mode === "create") {
      await addRobot(user.uid, selectedRobot);
    } else if (selectedRobot.id) {
      await updateRobot(user.uid, selectedRobot.id, selectedRobot);
    }
    const updated = await getRobots(user.uid);
    setRobots(updated as Robot[]);
    setPaneOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    await deleteRobot(user.uid, id);
    setRobots((prev) => prev.filter((r) => r.id !== id));
  };

  const handleEdit = (robot: Robot) => {
    setSelectedRobot(robot);
    setMode("view");
    setPaneOpen(true);
  };

  const handleFieldChange = (field: string, value: any) => {
    if (!selectedRobot) return;
    setSelectedRobot({ ...selectedRobot, [field]: value });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(robots);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setRobots(reordered);
  };

  return (
    <SidebarLayout currentPage="Dashboard" userFirstName={userFirstName}>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin border-t-blue-500"></div>
        </div>
      ) : (
        <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold text-gray-700">
              Welcome,{" "}
              <span className="text-blue-600">
                {userFirstName || user?.email}
              </span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              All systems nominal • 1 notification • warning
            </p>
          </div>

          <h2 className="text-2xl font-semibold mb-4">Connected Robots</h2>
          <button
            onClick={handleCreateClick}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Bot
          </button>

          <div className="overflow-y-auto pr-2">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="robots" direction="horizontal">
                {(provided) => (
                  <div
                    className="flex flex-wrap gap-4"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {robots.map((robot, index) => (
                      <Draggable
                        key={robot.id}
                        draggableId={robot.id!}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white shadow rounded-xl p-4 w-80 flex flex-col justify-between"
                          >
                            <div>
                              <h3 className="text-lg font-semibold mb-1">
                                {robot.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Type: {robot.type}
                              </p>
                              <p className="text-sm text-green-600">
                                Status: {robot.status}
                              </p>
                              <p className="text-sm">
                                Battery: {robot.battery ?? "N/A"}%
                              </p>
                            </div>

                            <div className="flex flex-col items-end mt-2">
                              <div
                                className="mb-2 p-2 rounded-full"
                                style={{ color: getRandomColor(robot.id!) }}
                              >
                                {getTypeIcon(robot.type)}
                              </div>
                              <div className="flex justify-between w-full">
                                <button
                                  onClick={() => handleEdit(robot)}
                                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDelete(robot.id!)}
                                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <RobotDetailsPane
            isOpen={paneOpen}
            onClose={() => setPaneOpen(false)}
            robot={selectedRobot || {}}
            onChange={handleFieldChange}
            onSave={handleSave}
            mode={mode}
          />
        </div>
      )}
    </SidebarLayout>
  );
}
