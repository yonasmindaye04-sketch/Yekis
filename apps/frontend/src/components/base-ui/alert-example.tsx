import { TbFileAlert } from "react-icons/tb"
import { Alert, AlertTitle } from "@/components/base-ui/alert"
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar"

const Alert6 = () => {
  return (
    <Alert className="flex items-center gap-2.5">
      <Avatar className="size-6 rounded-[5px]">
        <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
          <TbFileAlert className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <AlertTitle>This file may harm your system!</AlertTitle>
    </Alert>
  )
}

export { Alert6 }
export default Alert6
