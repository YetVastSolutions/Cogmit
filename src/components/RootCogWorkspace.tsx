"use client";

import { useState, useTransition } from "react";
import { Cog, CogNode } from "./Cog";
import { Button } from "./ui/button";

interface RootCogWorkspaceProps {
  rootNode: CogNode;
  saveChildAction: (
    parentId: string,
    content: string
  ) => Promise<{ success: boolean; error?: string; newChild?: CogNode }>;
}

export function RootCogWorkspace({
  rootNode,
  saveChildAction,
}: RootCogWorkspaceProps) {
  const [tree, setTree] = useState<CogNode>(rootNode);
  const [selectedCogId, setSelectedCogId] = useState<string>(rootNode.id);
  const [childContent, setChildContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSelect = (id: string) => {
    setSelectedCogId(id);
  };

  const handleAddChild = () => {
    if (!childContent.trim()) return;

    startTransition(async () => {
      const result = await saveChildAction(selectedCogId, childContent);
      if (result.success && result.newChild) {
        // Deep clone tree to append the new child
        const newTree = structuredClone(tree);

        const appendChild = (node: CogNode) => {
          if (node.id === selectedCogId) {
            if (!node.children) node.children = [];
            node.children.push(result.newChild!);
            return true;
          }
          if (node.children) {
            for (const child of node.children) {
              if (appendChild(child)) return true;
            }
          }
          return false;
        };

        appendChild(newTree);
        setTree(newTree);
        setChildContent("");
      } else {
        alert(result.error || "Failed to add child");
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full relative pb-32">
      <div className="flex-1 overflow-auto">
        <Cog
          node={tree}
          isRoot={true}
          selectedCogId={selectedCogId}
          onSelect={handleSelect}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.5)] z-10 flex justify-center">
        <div className="w-full max-w-5xl flex gap-4 items-end">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs text-muted-foreground font-medium px-1">
              Adding child to: <strong className="text-yellow-500">{selectedCogId === tree.id ? "Root" : selectedCogId}</strong>
            </span>
            <textarea
              className="w-full h-24 p-3 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
              placeholder="Enter child cognition..."
              value={childContent}
              onChange={(e) => setChildContent(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button
            onClick={handleAddChild}
            disabled={isPending || !childContent.trim()}
            className="mb-1"
          >
            {isPending ? "Adding..." : "Cogit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
